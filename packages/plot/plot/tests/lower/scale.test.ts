import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TICK_COUNT,
  inferCategoryDomain,
  resolveLinearScale,
  resolvePositionScale,
  scaleTicks,
  toTimestamp,
} from '../../src/lower/scale';

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

describe('inferCategoryDomain (ADR-01)', () => {
  it('category_domain_dedup_order', () => {
    expect(inferCategoryDomain(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });

  it('category_domain_numeric', () => {
    expect(inferCategoryDomain([2021, 2022, 2021])).toEqual([2021, 2022]);
  });

  it('category_domain_filter_nonscalar', () => {
    expect(inferCategoryDomain(['a', null, undefined, {}, 'b'])).toEqual(['a', 'b']);
  });
});

describe('resolvePositionScale band / point (ADR-01)', () => {
  it('band_coordinate_center_ordered', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x', domain: ['a', 'b', 'c'] }, [], [0, 300]);
    const ca = scale.coordinate('a');
    const cb = scale.coordinate('b');
    const cc = scale.coordinate('c');
    expect(ca).toBeLessThan(cb);
    expect(cb).toBeLessThan(cc);
    // band 中心等距
    expect(cb - ca).toBeCloseTo(cc - cb, 6);
  });

  it('band_bandwidth_positive', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x', domain: ['a', 'b', 'c'] }, [], [0, 300]);
    expect(scale.bandwidth).toBeGreaterThan(0);
  });

  it('band_single_category_full_range', () => {
    // paddingInner/Outer 0 + 单类别 → 占满整个 range，中心居中
    const scale = resolvePositionScale(
      { type: 'band', name: 'x', domain: ['only'], paddingInner: 0, paddingOuter: 0 },
      [],
      [0, 300],
    );
    expect(scale.bandwidth).toBeCloseTo(300, 6);
    expect(scale.coordinate('only')).toBeCloseTo(150, 6);
  });

  it('band_infers_domain_from_values', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x' }, ['x', 'y', 'x'], [0, 200]);
    expect(scale.ticks().values).toEqual(['x', 'y']);
  });

  it('band_unknown_category_nan', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x', domain: ['a', 'b'] }, [], [0, 300]);
    expect(Number.isNaN(scale.coordinate('zzz'))).toBe(true);
  });

  it('band_ticks_at_centers', () => {
    const scale = resolvePositionScale({ type: 'band', name: 'x', domain: ['a', 'b'] }, [], [0, 300]);
    const { values, labels } = scale.ticks();
    expect(values).toEqual(['a', 'b']);
    expect(labels).toEqual(['a', 'b']);
  });

  it('point_coordinate_zero_bandwidth', () => {
    const scale = resolvePositionScale({ type: 'point', name: 'x', domain: ['a', 'b'] }, [], [0, 100]);
    expect(scale.bandwidth).toBe(0);
    expect(scale.coordinate('a')).toBeLessThan(scale.coordinate('b'));
  });
});

describe('resolvePositionScale linear back-compat (ADR-01)', () => {
  it('linear_through_positionscale_unchanged', () => {
    const pos = resolvePositionScale({ type: 'linear', name: 'x', domain: [0, 2] }, [], [0, 480]);
    expect(pos.coordinate(1)).toBe(240);
    expect(pos.bandwidth).toBe(0);
    // ticks 与直接 scaleTicks 等价
    const direct = scaleTicks(resolveLinearScale({ domain: [0, 2] }, [], [0, 480]), DEFAULT_TICK_COUNT);
    expect(pos.ticks(DEFAULT_TICK_COUNT)).toEqual(direct);
  });

  it('linear_skips_non_numeric', () => {
    // 守 alpha.1 跳过语义：非数值（含数字字符串）→ NaN，不投影
    const pos = resolvePositionScale({ type: 'linear', name: 'x', domain: [0, 10] }, [], [0, 100]);
    expect(Number.isNaN(pos.coordinate('5'))).toBe(true);
    expect(Number.isNaN(pos.coordinate(undefined))).toBe(true);
    expect(pos.coordinate(5)).toBe(50);
  });

  it('linear_infers_domain_from_numeric_values', () => {
    // 原始值混入非数值，连续 scale 内部过滤后求 extent
    const pos = resolvePositionScale({ type: 'linear', name: 'x' }, [3, 'skip', 7, null], [0, 100]);
    expect(pos.coordinate(3)).toBe(0);
    expect(pos.coordinate(7)).toBe(100);
  });
});

describe('resolveTimeScale / toTimestamp (ADR-06, UTC)', () => {
  it('to_timestamp_number_iso_invalid', () => {
    expect(toTimestamp(1000)).toBe(1000);
    expect(toTimestamp('2024-03-01')).toBe(Date.parse('2024-03-01'));
    expect(toTimestamp('not-a-date')).toBeNull();
    expect(toTimestamp({})).toBeNull();
  });

  it('time_coordinate_endpoints', () => {
    const lo = Date.UTC(2024, 0, 1);
    const hi = Date.UTC(2024, 3, 1);
    const pos = resolvePositionScale({ type: 'time', name: 'x', domain: [lo, hi] }, [], [0, 300]);
    expect(pos.coordinate(lo)).toBeCloseTo(0, 6);
    expect(pos.coordinate(hi)).toBeCloseTo(300, 6);
    expect(pos.bandwidth).toBe(0);
  });

  it('time_parses_iso_value', () => {
    const lo = Date.UTC(2024, 0, 1);
    const hi = Date.UTC(2024, 0, 3);
    const pos = resolvePositionScale({ type: 'time', name: 'x', domain: [lo, hi] }, [], [0, 200]);
    // 2024-01-02（中点）→ 100
    expect(pos.coordinate('2024-01-02T00:00:00Z')).toBeCloseTo(100, 6);
  });

  it('time_ticks_month_boundary_utc', () => {
    const lo = Date.UTC(2024, 0, 1);
    const hi = Date.UTC(2024, 3, 1);
    const { values, labels } = resolvePositionScale({ type: 'time', name: 'x', domain: [lo, hi] }, [], [0, 300]).ticks(3);
    // UTC 确定性：Feb 1 在刻度里（值用 epoch ms）
    expect(values).toContain(Date.UTC(2024, 1, 1));
    expect(labels).toHaveLength(values.length);
    expect(labels.every(label => label.length > 0)).toBe(true);
  });

  it('time_domain_inferred_from_values', () => {
    const pos = resolvePositionScale({ type: 'time', name: 'x' }, ['2024-01-01', '2024-12-31'], [0, 100]);
    expect(pos.coordinate('2024-01-01')).toBeCloseTo(0, 6);
    expect(pos.coordinate('2024-12-31')).toBeCloseTo(100, 6);
  });

  it('time_bad_string_nan', () => {
    const pos = resolvePositionScale({ type: 'time', name: 'x', domain: [0, 1000] }, [], [0, 100]);
    expect(Number.isNaN(pos.coordinate('nope'))).toBe(true);
  });
});
