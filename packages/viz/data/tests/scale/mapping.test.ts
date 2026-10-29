import { describe, expect, it } from 'vitest';
import { number, strictObject } from 'zod';

import { RetikzDataError } from '../../src/error';
import type { ScaleResolution } from '../../src/scale';
import { defineScale, parseScaleOperation, resolveScale, resolveScaleRegistry } from '../../src/scale';

describe('宿主无关的值映射', () => {
  it('重建域和钳位设置保持独立，反向计算遵守合法输入范围', () => {
    const original = resolveScale({ type: 'sqrt', domain: [0, 100], range: [0, 1], params: { clamp: true } });
    const rebuilt = original.rebuild?.({ domain: [0, 400], clamp: false });
    expect(original.map(400)).toBe(1);
    expect(rebuilt?.map(900)).toBe(1.5);
    expect(rebuilt?.invert?.(0.5)).toBe(100);
    expect(rebuilt?.invert?.(-1)).toBeUndefined();
    expect(original.domain).toEqual([0, 100]);
    expect(() => original.rebuild?.({ domain: [-1, 100] })).toThrow(RetikzDataError);
  });

  it('无样本时可省略上下文，已有声明与上下文资源仍参与求值', () => {
    const threshold = resolveScale({ type: 'threshold', range: [4, 8, 12], params: { breakpoints: [30, 70] } });
    expect([threshold.map(0), threshold.map(30), threshold.map(70)]).toEqual([4, 8, 12]);
    const linear = resolveScale({ type: 'linear', domain: [0, 100] }, { defaultRange: [0, 1] });
    expect(linear.map(75)).toBe(0.75);
    const quantile = resolveScale({ type: 'quantile', range: [1, 2] });
    expect(quantile.domain).toEqual([]);
    expect(quantile.thresholds).toBeUndefined();
  });

  it('自定义映射在调用方省略样本时仍收到可用的空数组', () => {
    const registry = resolveScaleRegistry([
      defineScale({
        type: 'sample-count',
        paramsSchema: strictObject({}),
        isFieldCompatible: () => true,
        resolve: context => ({
          map: () => context.values.length,
          domain: context.values,
          range: [context.values.length],
        }),
      }),
    ]);
    expect(resolveScale({ type: 'sample-count' }, undefined, registry).map(1)).toBe(0);
    expect(resolveScale({ type: 'sample-count' }, { values: [1, 1, 2] }, registry).map(1)).toBe(3);
  });

  it('延迟求值与重建后的回调异常保留原始 cause', () => {
    const cause = new Error('deferred failure');
    const fail = (): never => {
      throw cause;
    };
    const resolution: ScaleResolution = {
      map: fail,
      domain: [0, 1],
      range: [0, 1],
      ticks: fail,
      invert: fail,
      rebuild: () => resolution,
    };
    const registry = resolveScaleRegistry([
      defineScale({
        type: 'deferred',
        paramsSchema: strictObject({}),
        isFieldCompatible: () => true,
        resolve: () => resolution,
      }),
    ]);
    const mapping = resolveScale({ type: 'deferred' }, { values: [] }, registry);
    const callbacks = [
      () => mapping.map(0),
      () => mapping.ticks?.(),
      () => mapping.invert?.(0),
      () => mapping.rebuild?.({ range: [0, 100] }).map(0),
    ];
    for (const callback of callbacks) {
      try {
        callback();
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(RetikzDataError);
        expect(error).toHaveProperty('cause', cause);
      }
    }
  });

  it('映射回调的领域错误保持原对象', () => {
    const cause = new RetikzDataError('domain failure');
    const registry = resolveScaleRegistry([
      defineScale({
        type: 'domain-error',
        paramsSchema: strictObject({}),
        isFieldCompatible: () => true,
        resolve: () => ({
          domain: [],
          range: [],
          map: () => {
            throw cause;
          },
        }),
      }),
    ]);
    const mapping = resolveScale({ type: 'domain-error' }, { values: [] }, registry);
    try {
      mapping.map(0);
      expect.unreachable();
    } catch (error) {
      expect(error).toBe(cause);
    }
  });

  it.each([
    ['linear', [0, 10], 5, 50],
    ['log', [1, 100], 10, 50],
    ['pow', [0, 10], 5, 25],
    ['sqrt', [0, 100], 25, 50],
    ['symlog', [-10, 10], 0, 50],
    ['radial', [0, 100], 25, 50],
  ])('%s 保留数学映射和缺值边界', (type, domain, input, expected) => {
    const mapping = resolveScale({ type, domain, range: [0, 100] }, { values: [] });
    expect(mapping.map(input)).toBeCloseTo(expected);
    expect(mapping.map(null)).toBeUndefined();
    expect(mapping.map('invalid')).toBeUndefined();
    expect(mapping.invert?.(expected)).toBeCloseTo(input);
  });

  it('time 使用 UTC 刻度并接受 ISO 时间输入', () => {
    const start = Date.UTC(2025, 0, 1);
    const end = Date.UTC(2025, 0, 3);
    const mapping = resolveScale({ type: 'time', domain: [start, end], range: [0, 100] }, { values: [] });
    expect(mapping.map('2025-01-02T00:00:00Z')).toBe(50);
    expect(mapping.ticks?.(2)).toEqual([start, Date.UTC(2025, 0, 2), end]);
  });

  it('band 返回中心和带宽，point 只声明步长', () => {
    const band = resolveScale({ type: 'band', domain: ['a', 'b'], range: [0, 100] }, { values: [] });
    const point = resolveScale({ type: 'point', domain: ['a', 'b'], range: [0, 100] }, { values: [] });
    expect(band.map('a')).toBe(25);
    expect(band.bandwidth).toBe(50);
    expect(band.step).toBe(50);
    expect(point.map('a')).toBe(0);
    expect(point.bandwidth).toBeUndefined();
    expect(point.step).toBe(100);
  });

  it('quantize 的边界与映射使用相同等宽区间', () => {
    const mapping = resolveScale({ type: 'quantize', domain: [0, 10], range: [1, 2] }, { values: [] });
    expect(mapping.thresholds).toEqual([5]);
    expect(mapping.map(5)).toBe(2);
    expect(mapping.map(-100)).toBe(1);
    expect(mapping.map(100)).toBe(2);
  });

  it('单向与发散插值共享宿主资源但保留各自退化语义', () => {
    const context = { values: [5], interpolators: new Map([['sample', (fraction: number) => String(fraction)]]) };
    const sequential = resolveScale({ type: 'sequential', params: { scheme: 'sample' } }, context);
    const diverging = resolveScale({ type: 'diverging', params: { scheme: 'sample' } }, context);
    expect(sequential.map(5)).toBe('0.5');
    expect(diverging.map(5)).toBe('0');
    expect(diverging.map(6)).toBe('1');
  });

  it('数学合法域与空样本默认保持明确', () => {
    expect(resolveScale({ type: 'linear' }, { values: [] }).domain).toEqual([0, 1]);
    expect(resolveScale({ type: 'log' }, { values: [-1, 0] }).domain).toEqual([1, 10]);
    expect(() => resolveScale({ type: 'log', domain: [0, 10] }, { values: [] })).toThrow(RetikzDataError);
    expect(() => resolveScale({ type: 'sqrt', domain: [-1, 10] }, { values: [] })).toThrow(RetikzDataError);
    expect(() => resolveScale({ type: 'pow', domain: [-1, 10], params: { exponent: 0.5 } }, { values: [] })).toThrow(
      RetikzDataError,
    );
    expect(() =>
      resolveScale({ type: 'threshold', range: [1, 2, 3], params: { breakpoints: [5, 5] } }, { values: [] }),
    ).toThrow(RetikzDataError);
    expect(() => resolveScale({ type: 'quantize', range: [1, 2], params: { count: 3 } }, { values: [] })).toThrow(
      RetikzDataError,
    );
  });
  it('线性映射可独立重建范围而不改变原映射', () => {
    const original = resolveScale({ type: 'linear', domain: [0, 10], range: [0, 100] }, { values: [] });
    const rebuilt = original.rebuild?.({ range: [0, 1] });
    expect(original.map(5)).toBe(50);
    expect(rebuilt?.map(5)).toBe(0.5);
    expect(original.map(5)).toBe(50);
    expect(original.map(null)).toBeUndefined();
  });

  it('阈值映射的数值和字符串输出共享上档包含边界', () => {
    for (const range of [
      [4, 8, 12],
      ['low', 'middle', 'high'],
    ]) {
      const scale = resolveScale({ type: 'threshold', params: { breakpoints: [30, 70] }, range }, { values: [] });
      expect(scale.map(29)).toBe(range[0]);
      expect(scale.map(30)).toBe(range[1]);
      expect(scale.map(70)).toBe(range[2]);
      expect(scale.thresholds).toEqual([30, 70]);
    }
  });

  it('分位训练保留样本重复值，图例读取实际分位边界', () => {
    const scale = resolveScale({ type: 'quantile', range: [1, 2] }, { values: [0, 0, 0, 100] });
    expect(scale.thresholds).toEqual([0]);
    expect(scale.map(0)).toBe(2);
  });

  it('空分位样本不伪造数学边界，保留求值的第一档结果', () => {
    const mapping = resolveScale({ type: 'quantile', range: ['a', 'b', 'c'] }, { values: [] });
    expect(mapping.map(-1)).toBe('a');
    expect(mapping.map(0)).toBe('a');
    expect(mapping.map(1)).toBe('a');
    expect(mapping.thresholds).toBeUndefined();
  });

  it('分类 unknown 策略显式区分缺值与扩展，支持布尔类别', () => {
    const fixed = resolveScale(
      { type: 'ordinal', domain: [true, false], range: ['yes', 'no'], params: { unknown: 'missing' } },
      { values: [] },
    );
    expect(fixed.map(true)).toBe('yes');
    expect(fixed.map('later')).toBeUndefined();
    const growing = resolveScale(
      { type: 'ordinal', domain: ['first'], range: [1, 2], params: { unknown: 'extend' } },
      { values: [] },
    );
    expect(growing.map('later')).toBe(2);
    expect(growing.domain).toEqual(['first', 'later']);
  });

  it('颜色线性插值接受单值域并显式钳位', () => {
    const scale = resolveScale(
      {
        type: 'linear',
        domain: [5, 5],
        range: ['#000000', '#ffffff'],
        params: { interpolation: 'color', clamp: true },
      },
      { values: [] },
    );
    expect(scale.map(5)).toBe('rgb(128, 128, 128)');
    expect(scale.bandwidth).toBeUndefined();
  });

  it('自定义 params 在外部入口解析并进入相同 registry', () => {
    const custom = defineScale({
      type: 'multiply',
      paramsSchema: strictObject({ factor: number() }),
      isFieldCompatible: () => true,
      resolve: (_context, params) => ({
        domain: [],
        range: [],
        map: value => (typeof value === 'number' ? value * params.factor : undefined),
      }),
    });
    const registry = resolveScaleRegistry([custom]);
    const operation = parseScaleOperation(JSON.parse('{"type":"multiply","params":{"factor":3}}'), registry);
    expect(resolveScale(operation, { values: [] }, registry).map(4)).toBe(12);
    expect(() => parseScaleOperation({ type: 'multiply', params: { factor: 'bad' } }, registry)).toThrow(
      RetikzDataError,
    );
    expect(() => resolveScaleRegistry([custom, custom])).toThrow(RetikzDataError);
    expect(() => resolveScale({ type: 'absent' }, { values: [] }, registry)).toThrow(RetikzDataError);
  });

  it('第三方解析异常保留 cause', () => {
    const cause = new Error('external failure');
    const custom = defineScale({
      type: 'broken',
      paramsSchema: strictObject({}),
      isFieldCompatible: () => true,
      resolve: () => {
        throw cause;
      },
    });
    try {
      resolveScale({ type: 'broken', params: {} }, { values: [] }, resolveScaleRegistry([custom]));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzDataError);
      expect(error).toHaveProperty('cause', cause);
    }
  });
});
