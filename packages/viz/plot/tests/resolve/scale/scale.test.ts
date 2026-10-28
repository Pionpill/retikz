import { coerceTimestamp, inferCategoryDomain } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { DEFAULT_TICK_COUNT, resolveLinearScale, resolveScaleRegistry, scaleTicks } from '../../../src/providers';
import { resolvePositionScale as resolvePositionScaleOp } from '../../../src/resolve/scale';
import type { IRPlotScaleOperation } from '../../../src/schemas';

// 内置 scale registry：position 分派经 registry，测试包一层省去逐处传参
const scaleRegistry = resolveScaleRegistry();

const resolvePositionScale = (
  operation: IRPlotScaleOperation,
  values: Array<unknown>,
  range: readonly [number, number],
) => resolvePositionScaleOp(operation, values, range, { registry: scaleRegistry });

describe('resolveLinearScale（契约 d3 比例尺）', () => {
  // Happy path
  it('像 alpha1 那样的比例尺地图', () => {
    const scale = resolveLinearScale({ type: 'linear', name: 'direct', domain: [0, 2] }, [], [0, 480]);

    expect(scale(0)).toBe(0);
    expect(scale(1)).toBe(240);
    expect(scale(2)).toBe(480);
  });

  it('比例从值推断域', () => {
    // domain 缺省时从数据值 extent 推断
    const scale = resolveLinearScale({ type: 'linear', name: 'direct', domainPadding: 0 }, [3, 7, 5], [0, 100]);

    expect(scale(3)).toBe(0);
    expect(scale(7)).toBe(100);
  });

  it.each([
    ['linear', { type: 'linear', name: 'x' }, [3, 5, 7]],
    ['time', { type: 'time', name: 'x' }, ['2024-01-01', '2024-12-31']],
    ['log', { type: 'log', name: 'x' }, [1, 10, 100]],
    ['pow', { type: 'pow', name: 'x' }, [3, 5, 7]],
    ['sqrt', { type: 'sqrt', name: 'x' }, [3, 5, 7]],
    ['symlog', { type: 'symlog', name: 'x' }, [-3, 5, 7]],
    ['radial', { type: 'radial', name: 'x' }, [3, 5, 7]],
  ] satisfies Array<[string, IRPlotScaleOperation, Array<unknown>]>)(
    '%s 推断域默认为零填充',
    (_family, operation, values) => {
      const scale = resolvePositionScale(operation, values, [0, 100]);

      expect(scale.coordinate(values[0])).toBeCloseTo(0, 6);
      expect(scale.coordinate(values.at(-1))).toBeCloseTo(100, 6);
    },
  );

  it('缩放域填充对象目标侧面', () => {
    const scale = resolvePositionScale(
      { type: 'linear', name: 'x', domainPadding: { kind: 'ratio', lower: 0.25 } },
      [10, 20],
      [0, 100],
    );

    expect(scale.domain()).toEqual([7.5, 20]);
  });

  // 边界
  it('缩放单个基准中点', () => {
    // d0=d1：d3 归一化返回 0.5 → range 中点
    const scale = resolveLinearScale({ type: 'linear', name: 'direct', domain: [5, 5] }, [], [0, 480]);

    expect(scale(5)).toBe(240);
  });

  it('缩放空值范围', () => {
    // 空数据 + 无显式 domain → safeExtent 回退 [0,1]
    const scale = resolveLinearScale({ type: 'linear', name: 'direct', domainPadding: 0 }, [], [0, 100]);

    expect(scale(0)).toBe(0);
    expect(scale(1)).toBe(100);
  });

  it('缩放比例很好的切换', () => {
    // nice 会把 [0,9.7] 扩展到整齐的 [0,10]
    const scale = resolveLinearScale({ type: 'linear', name: 'direct', domain: [0, 9.7], nice: true }, [], [0, 100]);

    expect(scale.domain()).toEqual([0, 10]);

    const plain = resolveLinearScale({ type: 'linear', name: 'direct', domain: [0, 9.7] }, [], [0, 100]);

    expect(plain.domain()).toEqual([0, 9.7]);
  });

  it('刻度钳拨动开关', () => {
    // clamp 现在真生效：域外输入夹到 range 端点
    const clamped = resolveLinearScale(
      { type: 'linear', name: 'direct', domain: [0, 10], range: [0, 100], clamp: true },
      [],
      [0, 1],
    );

    expect(clamped(20)).toBe(100);

    const open = resolveLinearScale({ type: 'linear', name: 'direct', domain: [0, 10], range: [0, 100] }, [], [0, 1]);

    expect(open(20)).toBe(200);
  });

  it('遵循显式值域', () => {
    const scale = resolveLinearScale(
      { type: 'linear', name: 'direct', domain: [0, 10], range: [50, 150] },
      [],
      [0, 480],
    );

    expect(scale(0)).toBe(50);
    expect(scale(10)).toBe(150);
  });
});

describe('resolvePositionScale 域填充单元', () => {
  it.each([
    ['linear', { type: 'linear', name: 'x', domain: [10, 20] }, 10, 20, [0, 100]],
    ['time', { type: 'time', name: 'x', domain: [10_000, 80_000] }, 10_000, 80_000, [0, 100]],
    ['log', { type: 'log', name: 'x', domain: [10, 100] }, 10, 100, [0, 100]],
    ['pow', { type: 'pow', name: 'x', domain: [1, 3], exponent: 2 }, 1, 3, [0, 100]],
    ['sqrt', { type: 'sqrt', name: 'x', domain: [1, 9] }, 1, 9, [0, 100]],
    ['symlog', { type: 'symlog', name: 'x', domain: [-10, 10], constant: 2 }, -10, 10, [0, 100]],
    ['radial', { type: 'radial', name: 'x', domain: [10, 100], range: [2, 102] }, 10, 100, [0, 500]],
  ] satisfies Array<[string, IRPlotScaleOperation, number, number, readonly [number, number]]>)(
    '%s 将源端点放置在精确的范围单位距离处',
    (_family, operation, lowerValue, upperValue, fallbackRange) => {
      const scale = resolvePositionScale(
        { ...operation, domainPadding: { kind: 'range', lower: 10, upper: 20 } },
        [],
        fallbackRange,
      );
      const [rangeStart, rangeEnd] = scale.range();
      const direction = Math.sign(rangeEnd - rangeStart);

      expect(scale.coordinate(lowerValue)).toBeCloseTo(rangeStart + direction * 10, 6);
      expect(scale.coordinate(upperValue)).toBeCloseTo(rangeEnd - direction * 20, 6);
    },
  );

  it('将子单元裸数视为范围距离', () => {
    const scale = resolvePositionScale(
      { type: 'linear', name: 'x', domain: [10, 20], domainPadding: 0.25 },
      [],
      [0, 100],
    );

    expect(scale.coordinate(10)).toBeCloseTo(0.25, 6);
    expect(scale.coordinate(20)).toBeCloseTo(99.75, 6);
  });

  it('保留显式的源域跨度比率', () => {
    const scale = resolvePositionScale(
      { type: 'linear', name: 'x', domain: [10, 20], domainPadding: { kind: 'ratio', lower: 0.25 } },
      [],
      [0, 100],
    );

    expect(scale.domain()).toEqual([7.5, 20]);
  });

  it('值域反转时 lower 与 upper 仍对应定义域端点', () => {
    const scale = resolvePositionScale(
      {
        type: 'linear',
        name: 'x',
        domain: [10, 20],
        domainPadding: { kind: 'range', lower: 10, upper: 20 },
      },
      [],
      [100, 0],
    );

    expect(scale.coordinate(10)).toBeCloseTo(90, 6);
    expect(scale.coordinate(20)).toBeCloseTo(20, 6);
  });

  it('使用显式比例范围而不是坐标回退范围', () => {
    const scale = resolvePositionScale(
      {
        type: 'linear',
        name: 'x',
        domain: [0, 10],
        range: [50, 150],
        domainPadding: { kind: 'range', lower: 10, upper: 20 },
      },
      [],
      [0, 500],
    );

    expect(scale.coordinate(0)).toBeCloseTo(60, 6);
    expect(scale.coordinate(10)).toBeCloseTo(130, 6);
  });

  it('将零填充保留为折叠范围的无操作', () => {
    const scale = resolvePositionScale({ type: 'linear', name: 'x', domain: [0, 10], domainPadding: 0 }, [], [5, 5]);

    expect(scale.domain()).toEqual([0, 10]);
  });

  it.each([
    ['collapsed range', [5, 5] as const, { kind: 'range', lower: 1 } as const],
    ['padding equal to range length', [0, 100] as const, { kind: 'range', lower: 40, upper: 60 } as const],
    ['padding above range length', [0, 100] as const, { kind: 'range', lower: 60, upper: 60 } as const],
    ['non-finite range', [0, Number.POSITIVE_INFINITY] as const, { kind: 'range', upper: 1 } as const],
  ])('拒绝 %s 进行正范围填充', (_name, range, domainPadding) => {
    expect(() =>
      resolvePositionScale({ type: 'linear', name: 'x', domain: [0, 10], domainPadding }, [], range),
    ).toThrow(/domainPadding.*range/i);
  });

  it.each([
    ['sqrt', { type: 'sqrt', name: 'x', domain: [0, 9], domainPadding: { kind: 'range', lower: 10 } }],
    ['radial', { type: 'radial', name: 'x', domain: [0, 9], domainPadding: { kind: 'range', lower: 10 } }],
    [
      'non-integer pow',
      { type: 'pow', name: 'x', domain: [0, 9], exponent: 0.5, domainPadding: { kind: 'range', lower: 10 } },
    ],
  ] satisfies Array<[string, IRPlotScaleOperation]>)('当范围填充需要负域时，%s 会失败', (_name, operation) => {
    expect(() => resolvePositionScale(operation, [], [0, 100])).toThrow(/non-negative/i);
  });

  it('在应用范围填充之前扩展单值域', () => {
    const scale = resolvePositionScale(
      {
        type: 'linear',
        name: 'x',
        domain: [5, 5],
        singleValueSpan: 2,
        domainPadding: { kind: 'range', lower: 10, upper: 10 },
      },
      [],
      [0, 100],
    );

    expect(scale.domain()).toEqual([3.75, 6.25]);
  });

  it('在范围填充后应用得很好', () => {
    const scale = resolvePositionScale(
      {
        type: 'linear',
        name: 'x',
        domain: [1.1, 9.1],
        nice: true,
        domainPadding: { kind: 'range', lower: 10, upper: 10 },
      },
      [],
      [0, 100],
    );

    expect(scale.domain()).toEqual([0, 11]);
  });
});

describe('scaleTicks（契约）', () => {
  it('刻度计数和标签', () => {
    const scale = resolveLinearScale({ type: 'linear', name: 'direct', domain: [0, 10] }, [], [0, 100]);
    const { values, labels } = scaleTicks(scale, 5);

    // d3 ticks 取 nice 整数刻度，含端点
    expect(values).toContain(0);
    expect(values).toContain(10);
    expect(labels).toHaveLength(values.length);
    expect(labels[0]).toBe('0');
  });

  it('scaleticks 默认计数', () => {
    const scale = resolveLinearScale({ type: 'linear', name: 'direct', domain: [0, 100] }, [], [0, 100]);
    const withDefault = scaleTicks(scale);
    const explicit = scaleTicks(scale, DEFAULT_TICK_COUNT);

    expect(withDefault.values).toEqual(explicit.values);
  });

  it('刻度线单个基准', () => {
    // 退化 domain：d3 仍给非空刻度（单点），不崩
    const scale = resolveLinearScale({ type: 'linear', name: 'direct', domain: [5, 5] }, [], [0, 100]);
    const { values, labels } = scaleTicks(scale, 5);

    expect(values.length).toBeGreaterThan(0);
    expect(labels).toHaveLength(values.length);
  });
});

describe('inferCategoryDomain（契约）', () => {
  it('类别定义域去重并保留顺序', () => {
    expect(inferCategoryDomain(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });

  it('类别定义域接受数值', () => {
    expect(inferCategoryDomain([2021, 2022, 2021])).toEqual([2021, 2022]);
  });

  it('类别定义域过滤非标量', () => {
    expect(inferCategoryDomain(['a', null, undefined, {}, 'b'])).toEqual(['a', 'b']);
  });
});

describe('resolvePositionScale 波段/点（契约）', () => {
  it('band 坐标中心按顺序排列', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x', domain: ['a', 'b', 'c'] }, [], [0, 300]);
    const ca = scale.coordinate('a');
    const cb = scale.coordinate('b');
    const cc = scale.coordinate('c');

    expect(ca).toBeLessThan(cb);
    expect(cb).toBeLessThan(cc);

    // band 中心等距
    expect(cb - ca).toBeCloseTo(cc - cb, 6);
  });

  it('band 带宽为正', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x', domain: ['a', 'b', 'c'] }, [], [0, 300]);

    expect(scale.bandwidth).toBeGreaterThan(0);
  });

  it('带单品类全系列', () => {
    // paddingInner/Outer 0 + 单类别 → 占满整个 range，中心居中
    const scale = resolvePositionScale(
      { type: 'band', name: 'x', domain: ['only'], paddingInner: 0, paddingOuter: 0 },
      [],
      [0, 300],
    );

    expect(scale.bandwidth).toBeCloseTo(300, 6);
    expect(scale.coordinate('only')).toBeCloseTo(150, 6);
  });

  it('带从值推断域', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x' }, ['x', 'y', 'x'], [0, 200]);

    expect(scale.ticks().values).toEqual(['x', 'y']);
  });

  it('带跳过非有限类别值', () => {
    const scale = resolvePositionScale(
      { type: 'band', name: 'x' },
      [Number.NaN, Infinity, -Infinity, 1, 'a'],
      [0, 200],
    );

    expect(scale.ticks().values).toEqual([1, 'a']);
  });

  it('带未知类别 nan', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x', domain: ['a', 'b'] }, [], [0, 300]);

    expect(Number.isNaN(scale.coordinate('zzz'))).toBe(true);
  });

  it('带在中心刻度', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x', domain: ['a', 'b'] }, [], [0, 300]);
    const { values, labels } = scale.ticks();

    expect(values).toEqual(['a', 'b']);
    expect(labels).toEqual(['a', 'b']);
  });

  it('point 坐标带宽为零', () => {
    const scale = resolvePositionScale({ type: 'point', name: 'x', domain: ['a', 'b'] }, [], [0, 100]);

    expect(scale.bandwidth).toBe(0);
    expect(scale.coordinate('a')).toBeLessThan(scale.coordinate('b'));
  });
});

describe('resolvePositionScale 线性后兼容（契约）', () => {
  it('线性通过位置比例不变', () => {
    const pos = resolvePositionScale({ type: 'linear', name: 'x', domain: [0, 2] }, [], [0, 480]);

    expect(pos.coordinate(1)).toBe(240);
    expect(pos.bandwidth).toBe(0);

    // ticks 与直接 scaleTicks 等价
    const direct = scaleTicks(
      resolveLinearScale({ type: 'linear', name: 'direct', domain: [0, 2] }, [], [0, 480]),
      DEFAULT_TICK_COUNT,
    );

    expect(pos.ticks(DEFAULT_TICK_COUNT)).toEqual(direct);
  });

  it('linear 跳过非数值', () => {
    // 非数值（含数字字符串）→ NaN，不投影
    const pos = resolvePositionScale({ type: 'linear', name: 'x', domain: [0, 10] }, [], [0, 100]);

    expect(Number.isNaN(pos.coordinate('5'))).toBe(true);
    expect(Number.isNaN(pos.coordinate(undefined))).toBe(true);
    expect(pos.coordinate(5)).toBe(50);
  });

  it('来自数字值的线性推断域', () => {
    // 原始值混入非数值，连续 scale 内部过滤后求 extent
    const pos = resolvePositionScale({ type: 'linear', name: 'x', domainPadding: 0 }, [3, 'skip', 7, null], [0, 100]);

    expect(pos.coordinate(3)).toBe(0);
    expect(pos.coordinate(7)).toBe(100);
  });
});

describe('resolveTimeScale / coerceTimestamp（契约，UTC）', () => {
  it('时间戳编号 iso 无效', () => {
    expect(coerceTimestamp(1000)).toBe(1000);
    expect(coerceTimestamp('2024-03-01')).toBe(Date.parse('2024-03-01'));
    expect(coerceTimestamp('not-a-date')).toBeNull();
    expect(coerceTimestamp({})).toBeNull();
  });

  it('time 坐标映射端点', () => {
    const lo = Date.UTC(2024, 0, 1);
    const hi = Date.UTC(2024, 3, 1);
    const pos = resolvePositionScale({ type: 'time', name: 'x', domain: [lo, hi] }, [], [0, 300]);

    expect(pos.coordinate(lo)).toBeCloseTo(0, 6);
    expect(pos.coordinate(hi)).toBeCloseTo(300, 6);
    expect(pos.bandwidth).toBe(0);
  });

  it('时间解析 iso 值', () => {
    const lo = Date.UTC(2024, 0, 1);
    const hi = Date.UTC(2024, 0, 3);
    const pos = resolvePositionScale({ type: 'time', name: 'x', domain: [lo, hi] }, [], [0, 200]);

    // 2024-01-02（中点）→ 100
    expect(pos.coordinate('2024-01-02T00:00:00Z')).toBeCloseTo(100, 6);
  });

  it('时间刻度月份边界 utc', () => {
    const lo = Date.UTC(2024, 0, 1);
    const hi = Date.UTC(2024, 3, 1);
    const { values, labels } = resolvePositionScale({ type: 'time', name: 'x', domain: [lo, hi] }, [], [0, 300]).ticks(
      3,
    );

    // UTC 确定性：Feb 1 在刻度里（值用 epoch ms）
    expect(values).toContain(Date.UTC(2024, 1, 1));
    expect(labels).toHaveLength(values.length);
    expect(labels.every(label => label.length > 0)).toBe(true);
  });

  it('从值推断的时域', () => {
    const pos = resolvePositionScale(
      { type: 'time', name: 'x', domainPadding: 0 },
      ['2024-01-01', '2024-12-31'],
      [0, 100],
    );

    expect(pos.coordinate('2024-01-01')).toBeCloseTo(0, 6);
    expect(pos.coordinate('2024-12-31')).toBeCloseTo(100, 6);
  });

  it('时间错误字符串 nan', () => {
    const pos = resolvePositionScale({ type: 'time', name: 'x', domain: [0, 1000] }, [], [0, 100]);

    expect(Number.isNaN(pos.coordinate('nope'))).toBe(true);
  });
});
