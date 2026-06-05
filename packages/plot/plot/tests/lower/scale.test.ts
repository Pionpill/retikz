import { describe, expect, it } from 'vitest';
import { DEFAULT_TICK_COUNT, resolveLinearScale, scaleTicks } from '../../src/lower/scale';

describe('resolveLinearScale (ADR-02 d3-scale)', () => {
  // Happy path
  it('scale_maps_like_alpha1', () => {
    const scale = resolveLinearScale({ domain: [0, 2] }, [], [0, 480]);
    expect(scale(0)).toBe(0);
    expect(scale(1)).toBe(240);
    expect(scale(2)).toBe(480);
  });

  it('scale_infers_domain_from_values', () => {
    // domain 缺省时从数据值 extent 推断
    const scale = resolveLinearScale({}, [3, 7, 5], [0, 100]);
    expect(scale(3)).toBe(0);
    expect(scale(7)).toBe(100);
  });

  // 边界
  it('scale_single_datum_midpoint', () => {
    // d0=d1：d3 归一化返回 0.5 → range 中点（守住 alpha.1 自写 linear 的行为）
    const scale = resolveLinearScale({ domain: [5, 5] }, [], [0, 480]);
    expect(scale(5)).toBe(240);
  });

  it('scale_empty_values_extent', () => {
    // 空数据 + 无显式 domain → safeExtent 回退 [0,1]
    const scale = resolveLinearScale({}, [], [0, 100]);
    expect(scale(0)).toBe(0);
    expect(scale(1)).toBe(100);
  });

  it('scale_nice_toggle', () => {
    // nice 现在真生效（alpha.1 自写 linear 曾忽略）：[0,9.7] → 取整到 [0,10]
    const scale = resolveLinearScale({ domain: [0, 9.7], nice: true }, [], [0, 100]);
    expect(scale.domain()).toEqual([0, 10]);
    const plain = resolveLinearScale({ domain: [0, 9.7] }, [], [0, 100]);
    expect(plain.domain()).toEqual([0, 9.7]);
  });

  it('scale_clamp_toggle', () => {
    // clamp 现在真生效：域外输入夹到 range 端点
    const clamped = resolveLinearScale({ domain: [0, 10], range: [0, 100], clamp: true }, [], [0, 1]);
    expect(clamped(20)).toBe(100);
    const open = resolveLinearScale({ domain: [0, 10], range: [0, 100] }, [], [0, 1]);
    expect(open(20)).toBe(200);
  });

  it('explicit_range_respected', () => {
    const scale = resolveLinearScale({ domain: [0, 10], range: [50, 150] }, [], [0, 480]);
    expect(scale(0)).toBe(50);
    expect(scale(10)).toBe(150);
  });
});

describe('scaleTicks (ADR-02)', () => {
  it('scaleticks_count_and_labels', () => {
    const scale = resolveLinearScale({ domain: [0, 10] }, [], [0, 100]);
    const { values, labels } = scaleTicks(scale, 5);
    // d3 ticks 取 nice 整数刻度，含端点
    expect(values).toContain(0);
    expect(values).toContain(10);
    expect(labels).toHaveLength(values.length);
    expect(labels[0]).toBe('0');
  });

  it('scaleticks_default_count', () => {
    const scale = resolveLinearScale({ domain: [0, 100] }, [], [0, 100]);
    const withDefault = scaleTicks(scale);
    const explicit = scaleTicks(scale, DEFAULT_TICK_COUNT);
    expect(withDefault.values).toEqual(explicit.values);
  });

  it('scaleticks_single_datum', () => {
    // 退化 domain：d3 仍给非空刻度（单点），不崩
    const scale = resolveLinearScale({ domain: [5, 5] }, [], [0, 100]);
    const { values, labels } = scaleTicks(scale, 5);
    expect(values.length).toBeGreaterThan(0);
    expect(labels).toHaveLength(values.length);
  });
});
