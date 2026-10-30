import { resolveScale } from '@retikz/data';
import { defineScale } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { number, strictObject } from 'zod';

import { resolveScaleRegistry } from '../../../src/providers';
import { assertBaselineScaleCompatible, resolvePositionScale } from '../../../src/resolve/scale';

const channels = [
  {
    kind: 'position' as const,
    channel: 'scaled-position',
    role: 'x',
    pick: () => undefined,
    scales: { 'scaled-unit': { continuity: 'continuous' as const, allowsBaseline: false } },
  },
];

describe('Plot 直接扩展数学映射定义', () => {
  const mathematical = defineScale({
    type: 'scaled-unit',
    paramsSchema: strictObject({ maximum: number() }),
    isFieldCompatible: () => true,
    resolve: (context, params) =>
      resolveScale({ type: 'linear', domain: [0, params.maximum], range: context.range }, context),
  });

  it('同一数学定义独立用于 Data 与 Plot，实例参数进入同一解析回调', () => {
    const definition = defineScale({
      ...mathematical,
    });
    const registry = resolveScaleRegistry([definition]);
    const position = resolvePositionScale({ type: 'scaled-unit', name: 'x', params: { maximum: 10 } }, [], [0, 100], {
      registry,
      channels,
    });
    expect(position.coordinate(5)).toBe(50);
    expect(position.ticks(2).values).toEqual([0, 5, 10]);
    position.setRange([0, 200]);
    expect(position.coordinate(5)).toBe(100);
    expect(mathematical.resolve({ values: [], range: [0, 1] }, { maximum: 10 }).map(5)).toBe(0.5);
  });

  it('能映射零不等于允许零基线，策略由 Plot 明确声明', () => {
    const registry = resolveScaleRegistry([
      defineScale({
        ...mathematical,
      }),
    ]);
    expect(() => assertBaselineScaleCompatible('scaled-unit', [{ type: 'interval' }], { registry, channels })).toThrow(
      /baseline/,
    );
    expect(() =>
      assertBaselineScaleCompatible('scaled-unit', [{ type: 'point', encodings: {} }], { registry, channels }),
    ).not.toThrow();
  });

  it('未声明位置策略的数值定义不能隐式成为坐标角色', () => {
    const registry = resolveScaleRegistry([mathematical]);
    expect(() =>
      resolvePositionScale({ type: 'scaled-unit', name: 'x', params: { maximum: 10 } }, [], [0, 100], { registry }),
    ).toThrow(/cannot drive a positional/);
  });

  it('位置策略只授权对应角色', () => {
    const registry = resolveScaleRegistry([mathematical]);
    expect(() =>
      resolvePositionScale({ type: 'scaled-unit', name: 'y', params: { maximum: 10 } }, [], [0, 100], {
        registry,
        channels,
        role: 'y',
      }),
    ).toThrow(/cannot drive a positional/);
  });

  it('只绘制位置不要求刻度，实际请求轴刻度时才诊断缺失能力', () => {
    const registry = resolveScaleRegistry([
      defineScale({
        ...mathematical,
        resolve: (context, params) => {
          const mapping = mathematical.resolve(context, params);
          return { ...mapping, ticks: undefined };
        },
      }),
    ]);
    const position = resolvePositionScale({ type: 'scaled-unit', name: 'x', params: { maximum: 10 } }, [], [0, 100], {
      registry,
      channels,
    });
    expect(position.coordinate(5)).toBe(50);
    expect(() => position.ticks(5)).toThrow(/does not provide ticks/);
  });

  it('缺值可跳过，实际产生非数值位置时明确报错', () => {
    const registry = resolveScaleRegistry([
      defineScale({
        ...mathematical,
        resolve: (context, params) => ({
          ...mathematical.resolve(context, params),
          map: value => (value === null ? undefined : 'invalid-position'),
        }),
      }),
    ]);
    const position = resolvePositionScale({ type: 'scaled-unit', name: 'x', params: { maximum: 10 } }, [], [0, 100], {
      registry,
      channels,
    });
    expect(position.coordinate(null)).toBeNaN();
    expect(() => position.coordinate(5)).toThrow(/must produce finite numbers/);
  });
});
