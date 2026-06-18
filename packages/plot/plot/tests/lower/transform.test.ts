import { describe, expect, it } from 'vitest';
import type { ExternalRow } from '../../src/ir';
import { applyTransforms } from '../../src/compile/transform';
import { readSourceIndices, tagSourceIndex } from '../../src/compile/provenance';

const SALES: Array<ExternalRow> = [
  { month: 'Jan', product: 'A', revenue: 3 },
  { month: 'Jan', product: 'B', revenue: 5 },
  { month: 'Feb', product: 'A', revenue: 2 },
  { month: 'Feb', product: 'B', revenue: 4 },
];

describe('applyTransforms (ADR-03)', () => {
  it('transform_empty_pipeline', () => {
    expect(applyTransforms(SALES)).toBe(SALES);
    expect(applyTransforms(SALES, [])).toBe(SALES);
  });

  // sort
  it('sort_ascending', () => {
    const rows = [{ m: 3 }, { m: 1 }, { m: 2 }];
    expect(applyTransforms(rows, [{ kind: 'sort', field: 'm' }]).map(r => r.m)).toEqual([1, 2, 3]);
  });

  it('sort_descending', () => {
    const rows = [{ m: 1 }, { m: 3 }, { m: 2 }];
    expect(applyTransforms(rows, [{ kind: 'sort', field: 'm', order: 'descending' }]).map(r => r.m)).toEqual([3, 2, 1]);
  });

  it('sort_stable', () => {
    const rows = [{ m: 1, tag: 'a' }, { m: 1, tag: 'b' }, { m: 0, tag: 'c' }];
    const out = applyTransforms(rows, [{ kind: 'sort', field: 'm' }]);
    expect(out.map(r => r.tag)).toEqual(['c', 'a', 'b']);
  });

  // stack
  it('stack_two_series', () => {
    const out = applyTransforms(SALES, [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }]);
    // 保持输入顺序，追加 y0/y1；Jan: A[0,3] B[3,8]；Feb: A[0,2] B[2,6]
    expect(out[0]).toMatchObject({ month: 'Jan', product: 'A', y0: 0, y1: 3 });
    expect(out[1]).toMatchObject({ month: 'Jan', product: 'B', y0: 3, y1: 8 });
    expect(out[2]).toMatchObject({ month: 'Feb', product: 'A', y0: 0, y1: 2 });
    expect(out[3]).toMatchObject({ month: 'Feb', product: 'B', y0: 2, y1: 6 });
  });

  it('stack_first_segment_zero', () => {
    const out = applyTransforms(SALES, [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }]);
    // 每组首系列 y0 = 0
    expect(out.filter(r => r.product === 'A').every(r => r.y0 === 0)).toBe(true);
  });

  it('stack_single_series', () => {
    const rows = [{ x: 'a', s: 'X', v: 5 }];
    const out = applyTransforms(rows, [{ kind: 'stack', x: 'x', y: 'v', groupBy: 's' }]);
    expect(out[0]).toMatchObject({ y0: 0, y1: 5 });
  });

  it('stack_missing_field_counts_zero', () => {
    const rows = [
      { x: 'a', s: 'A', v: 3 },
      { x: 'a', s: 'B' }, // 缺 v → 按 0
    ];
    const out = applyTransforms(rows, [{ kind: 'stack', x: 'x', y: 'v', groupBy: 's' }]);
    expect(out[1]).toMatchObject({ y0: 3, y1: 3 });
  });

  it('stack_custom_output_fields', () => {
    const rows = [{ x: 'a', s: 'A', v: 2 }];
    const out = applyTransforms(rows, [
      { kind: 'stack', x: 'x', y: 'v', groupBy: 's', startField: 'lo', endField: 'hi' },
    ]);
    expect(out[0]).toMatchObject({ lo: 0, hi: 2 });
    expect(out[0]).not.toHaveProperty('y0');
  });

  // ADR-02：泛化 stack —— 缺省 x / groupBy 的单链累积（按数据序），喂饼图
  it('stack_single_chain_accumulates_in_data_order', () => {
    const SHARE = [{ label: 'A', value: 3 }, { label: 'B', value: 5 }, { label: 'C', value: 2 }];
    const out = applyTransforms(SHARE, [{ kind: 'stack', y: 'value' }]);
    // 行序累积：A[0,3] B[3,8] C[8,10]
    expect(out[0]).toMatchObject({ label: 'A', y0: 0, y1: 3 });
    expect(out[1]).toMatchObject({ label: 'B', y0: 3, y1: 8 });
    expect(out[2]).toMatchObject({ label: 'C', y0: 8, y1: 10 });
  });

  it('stack_single_chain_custom_output_fields', () => {
    const out = applyTransforms([{ label: 'A', value: 4 }, { label: 'B', value: 6 }], [
      { kind: 'stack', y: 'value', startField: 'a0', endField: 'a1' },
    ]);
    expect(out[0]).toMatchObject({ a0: 0, a1: 4 });
    expect(out[1]).toMatchObject({ a0: 4, a1: 10 });
  });

  // pipeline
  it('pipeline_sort_then_stack', () => {
    // 先按 product 降序再堆叠 → 系列累加序随排序后的出现序（B 先于 A）
    const out = applyTransforms(SALES, [
      { kind: 'sort', field: 'product', order: 'descending' },
      { kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' },
    ]);
    const janB = out.find(r => r.month === 'Jan' && r.product === 'B');
    expect(janB).toMatchObject({ y0: 0, y1: 5 });
  });
});

// alpha.12 ADR-01：bin（连续分箱，改行数）
describe('applyBin (alpha.12 ADR-01)', () => {
  // [0,10] 域、count 10 → 10 个等宽箱（含空箱），值落箱：0,1,2,8,9,10
  const GAPPED: Array<ExternalRow> = [{ m: 0 }, { m: 1 }, { m: 2 }, { m: 8 }, { m: 9 }, { m: 10 }];

  it('bin_count_histogram_exact_bins_and_empty', () => {
    const out = applyTransforms(GAPPED, [{ kind: 'bin', field: 'm', count: 10, reduce: 'count' }]);
    // 恰 10 箱（count:N → N 个箱，含空箱）
    expect(out.length).toBe(10);
    // 域 [0,10]（min/max 已 nice）、等宽 1、紧贴排列
    expect(out[0]).toMatchObject({ binStart: 0, binEnd: 1 });
    expect(out[9]).toMatchObject({ binStart: 9, binEnd: 10 });
    for (let i = 0; i < out.length - 1; i++) expect(out[i].binEnd).toBe(out[i + 1].binStart);
    // 频数：[1,1,1,0,0,0,0,0,1,2]（10 落最后一箱，含上界）
    expect(out.map(r => r.binValue)).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 1, 2]);
    // 空箱仍产行、binValue=0
    expect(out[4]).toMatchObject({ binStart: 4, binEnd: 5, binValue: 0 });
  });

  it('bin_step_strategy_tiles_from_lower_bound', () => {
    const rows = [{ m: 0 }, { m: 3 }, { m: 7 }, { m: 10 }];
    const out = applyTransforms(rows, [{ kind: 'bin', field: 'm', step: 5 }]);
    // [0,5),[5,10] → 2 箱（last 含上界）；count: 0,3 → bin0=2；7,10 → bin1=2
    expect(out.length).toBe(2);
    expect(out[0]).toMatchObject({ binStart: 0, binEnd: 5, binValue: 2 });
    expect(out[1]).toMatchObject({ binStart: 5, binEnd: 10, binValue: 2 });
  });

  it('bin_thresholds_strategy_k_plus_one_bins', () => {
    const rows = [{ m: 5 }, { m: 15 }, { m: 25 }, { m: 35 }];
    // K=3 thresholds + extent [0,40] 端点补齐 → edges [0,10,20,30,40] → 4 箱
    const out = applyTransforms(rows, [{ kind: 'bin', field: 'm', thresholds: [10, 20, 30], extent: [0, 40] }]);
    expect(out.length).toBe(4);
    expect(out.map(r => [r.binStart, r.binEnd])).toEqual([[0, 10], [10, 20], [20, 30], [30, 40]]);
    expect(out.map(r => r.binValue)).toEqual([1, 1, 1, 1]);
  });

  it('bin_reduce_sum_mean_min_max', () => {
    const rows = [{ m: 1, w: 10 }, { m: 2, w: 20 }, { m: 8, w: 5 }];
    const sum = applyTransforms(rows, [{ kind: 'bin', field: 'm', step: 5, reduce: 'sum', reduceField: 'w' }]);
    // [0,5): w 10,20 → 30；[5,10]: w 5 → 5
    expect(sum.map(r => r.binValue)).toEqual([30, 5]);
    const mean = applyTransforms(rows, [{ kind: 'bin', field: 'm', step: 5, reduce: 'mean', reduceField: 'w' }]);
    expect(mean.map(r => r.binValue)).toEqual([15, 5]);
    const min = applyTransforms(rows, [{ kind: 'bin', field: 'm', step: 5, reduce: 'min', reduceField: 'w' }]);
    expect(min.map(r => r.binValue)).toEqual([10, 5]);
    const max = applyTransforms(rows, [{ kind: 'bin', field: 'm', step: 5, reduce: 'max', reduceField: 'w' }]);
    expect(max.map(r => r.binValue)).toEqual([20, 5]);
  });

  it('bin_custom_output_fields', () => {
    // step 从域下界（观测 min = 0）平铺 → [0,5]
    const out = applyTransforms([{ m: 0 }], [{ kind: 'bin', field: 'm', step: 5, startField: 'lo', endField: 'hi', valueField: 'n' }]);
    expect(out[0]).toMatchObject({ lo: 0, hi: 5, n: 1 });
    expect(out[0]).not.toHaveProperty('binStart');
  });

  it('bin_empty_data_produces_no_bins', () => {
    expect(applyTransforms([], [{ kind: 'bin', field: 'm', count: 10 }])).toEqual([]);
  });

  it('bin_single_value_does_not_crash', () => {
    const out = applyTransforms([{ m: 5 }], [{ kind: 'bin', field: 'm', count: 4 }]);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.every(r => typeof r.binStart === 'number' && typeof r.binEnd === 'number')).toBe(true);
    // 唯一观测计入某箱、总频数 1
    expect(out.reduce((acc, r) => acc + (r.binValue as number), 0)).toBe(1);
  });

  it('bin_reduce_sum_missing_reduceField_fail_loud', () => {
    expect(() => applyTransforms([{ m: 1 }], [{ kind: 'bin', field: 'm', step: 5, reduce: 'sum' }])).toThrow(/reduceField/);
  });

  it('bin_conflicting_strategy_fail_loud', () => {
    expect(() => applyTransforms([{ m: 1 }], [{ kind: 'bin', field: 'm', count: 5, step: 2 }])).toThrow(/mutually exclusive|strateg/i);
  });

  it('bin_step_float_drift_keeps_domain_max', () => {
    // 浮点箱宽（0.1）+ extent 上界观测：末边乘法/钉值须覆盖 domainMax，否则 1.0 落空被丢（bug hunt 回归）
    const rows: Array<ExternalRow> = Array.from({ length: 11 }, (_, i) => ({ v: i * 0.1 }));
    const out = applyTransforms(rows, [{ kind: 'bin', field: 'v', step: 0.1, extent: [0, 1] }]);
    // 11 个观测一个不丢
    expect(out.reduce((acc, r) => acc + (r.binValue as number), 0)).toBe(11);
  });

  it('bin_count_float_drift_keeps_domain_max', () => {
    // count 策略下末边钉到 hi：非整除域不丢上界观测
    const rows: Array<ExternalRow> = Array.from({ length: 8 }, (_, i) => ({ v: i }));
    const out = applyTransforms(rows, [{ kind: 'bin', field: 'v', count: 3, extent: [0, 7] }]);
    expect(out.reduce((acc, r) => acc + (r.binValue as number), 0)).toBe(8);
  });

  it('bin_thresholds_outside_extent_filtered', () => {
    // 域外阈值剔除：thresholds [3,100] + 观测域 [1,9] → 内部仅 3 → [1,3,9] 两箱，无倒退/丢数
    const rows: Array<ExternalRow> = [{ m: 1 }, { m: 5 }, { m: 9 }];
    const out = applyTransforms(rows, [{ kind: 'bin', field: 'm', thresholds: [3, 100] }]);
    expect(out.length).toBe(2);
    expect(out.map(r => [r.binStart, r.binEnd])).toEqual([[1, 3], [3, 9]]);
    expect(out.reduce((acc, r) => acc + (r.binValue as number), 0)).toBe(3);
  });

  it('bin_group_level_provenance_source_indices', () => {
    // 分箱产 datum 的 provenance 指向源行集合（组级），而非单 sourceIndex
    const tagged = tagSourceIndex([{ m: 0 }, { m: 1 }, { m: 8 }]); // source idx 0,1,2
    const out = applyTransforms(tagged, [{ kind: 'bin', field: 'm', step: 5 }]);
    // [0,5): 源行 0,1；[5,10]: 源行 2
    expect(readSourceIndices(out[0])).toEqual([0, 1]);
    expect(readSourceIndices(out[1])).toEqual([2]);
  });
});

// alpha.12 ADR-01：aggregate（分组聚合，改行数）
describe('applyAggregate (alpha.12 ADR-01)', () => {
  const ORDERS: Array<ExternalRow> = [
    { region: 'N', product: 'A', revenue: 3 },
    { region: 'N', product: 'B', revenue: 5 },
    { region: 'S', product: 'A', revenue: 2 },
    { region: 'S', product: 'A', revenue: 4 },
  ];

  it('aggregate_groupby_sum', () => {
    const out = applyTransforms(ORDERS, [{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue', as: 'total' }]);
    expect(out.length).toBe(2);
    expect(out[0]).toMatchObject({ region: 'N', total: 8 });
    expect(out[1]).toMatchObject({ region: 'S', total: 6 });
  });

  it('aggregate_default_as_name', () => {
    const out = applyTransforms(ORDERS, [{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue' }]);
    // as 缺省 = reduce + 首字母大写 field
    expect(out[0]).toMatchObject({ region: 'N', sumRevenue: 8 });
  });

  it('aggregate_multikey_composite', () => {
    const out = applyTransforms(ORDERS, [{ kind: 'aggregate', groupBy: ['region', 'product'], reduce: 'sum', field: 'revenue', as: 't' }]);
    // 复合键：N/A, N/B, S/A
    expect(out.length).toBe(3);
    expect(out).toEqual([
      expect.objectContaining({ region: 'N', product: 'A', t: 3 }),
      expect.objectContaining({ region: 'N', product: 'B', t: 5 }),
      expect.objectContaining({ region: 'S', product: 'A', t: 6 }),
    ]);
  });

  it('aggregate_count_no_field', () => {
    const out = applyTransforms(ORDERS, [{ kind: 'aggregate', groupBy: ['region'], reduce: 'count' }]);
    // count 默认 as = 'count'、值 = 组行数
    expect(out[0]).toMatchObject({ region: 'N', count: 2 });
    expect(out[1]).toMatchObject({ region: 'S', count: 2 });
  });

  it('aggregate_mean_min_max', () => {
    const mean = applyTransforms(ORDERS, [{ kind: 'aggregate', groupBy: ['region'], reduce: 'mean', field: 'revenue', as: 'v' }]);
    expect(mean[0].v).toBe(4); // N: (3+5)/2
    expect(mean[1].v).toBe(3); // S: (2+4)/2
    const min = applyTransforms(ORDERS, [{ kind: 'aggregate', groupBy: ['region'], reduce: 'min', field: 'revenue', as: 'v' }]);
    expect(min.map(r => r.v)).toEqual([3, 2]);
    const max = applyTransforms(ORDERS, [{ kind: 'aggregate', groupBy: ['region'], reduce: 'max', field: 'revenue', as: 'v' }]);
    expect(max.map(r => r.v)).toEqual([5, 4]);
  });

  it('aggregate_changes_row_count', () => {
    const out = applyTransforms(ORDERS, [{ kind: 'aggregate', groupBy: ['region'], reduce: 'count' }]);
    expect(out.length).not.toBe(ORDERS.length);
    expect(out.length).toBe(2);
  });

  it('aggregate_missing_field_fail_loud', () => {
    expect(() => applyTransforms(ORDERS, [{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum' }])).toThrow(/field/);
  });

  it('aggregate_group_level_provenance_source_indices', () => {
    const tagged = tagSourceIndex(ORDERS); // 0,1,2,3
    const out = applyTransforms(tagged, [{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue', as: 't' }]);
    expect(readSourceIndices(out[0])).toEqual([0, 1]); // N
    expect(readSourceIndices(out[1])).toEqual([2, 3]); // S
  });

  // 交互：aggregate（改行数）后接 stack（保行数）
  it('aggregate_then_stack_chain', () => {
    const out = applyTransforms(ORDERS, [
      { kind: 'aggregate', groupBy: ['region', 'product'], reduce: 'sum', field: 'revenue', as: 'total' },
      { kind: 'stack', x: 'region', y: 'total', groupBy: 'product' },
    ]);
    // 聚合 → N/A=3,N/B=5,S/A=6；按 region stack：N: A[0,3] B[3,8]；S: A[0,6]
    const na = out.find(r => r.region === 'N' && r.product === 'A');
    const nb = out.find(r => r.region === 'N' && r.product === 'B');
    expect(na).toMatchObject({ y0: 0, y1: 3 });
    expect(nb).toMatchObject({ y0: 3, y1: 8 });
  });
});

// alpha.12 ADR-02：normalize（组内百分比归一化，保行数）
describe('applyNormalize (alpha.12 ADR-02)', () => {
  const REVENUE: Array<ExternalRow> = [
    { quarter: 'Q1', product: 'A', amount: 3 },
    { quarter: 'Q1', product: 'B', amount: 1 },
    { quarter: 'Q2', product: 'A', amount: 5 },
    { quarter: 'Q2', product: 'B', amount: 5 },
  ];

  it('normalize_group_share_percent', () => {
    const out = applyTransforms(REVENUE, [{ kind: 'normalize', field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' }]);
    // Q1 总 4 → A 75, B 25；Q2 总 10 → A 50, B 50；原 amount 保留
    expect(out[0]).toMatchObject({ amount: 3, share: 75 });
    expect(out[1]).toMatchObject({ amount: 1, share: 25 });
    expect(out[2]).toMatchObject({ share: 50 });
    expect(out[3]).toMatchObject({ share: 50 });
    // 每组 share 之和 = 100
    expect(out.filter(r => r.quarter === 'Q1').reduce((a, r) => a + (r.share as number), 0)).toBe(100);
  });

  it('normalize_fraction_default', () => {
    const out = applyTransforms(REVENUE, [{ kind: 'normalize', field: 'amount', groupBy: ['quarter'], as: 'frac' }]);
    expect(out[0].frac).toBeCloseTo(0.75, 9);
  });

  it('normalize_overwrite_in_place', () => {
    const out = applyTransforms([{ g: 'x', v: 2 }, { g: 'x', v: 2 }], [{ kind: 'normalize', field: 'v', groupBy: ['g'] }]);
    // as 缺省 → 原位覆盖 v
    expect(out[0].v).toBeCloseTo(0.5, 9);
  });

  it('normalize_global_when_no_groupby', () => {
    const out = applyTransforms([{ v: 1 }, { v: 3 }], [{ kind: 'normalize', field: 'v', basis: 'percent', as: 's' }]);
    // 全行单组：总 4 → 25, 75
    expect(out.map(r => r.s)).toEqual([25, 75]);
  });

  it('normalize_zero_group_sum_no_nan', () => {
    const out = applyTransforms([{ g: 'z', v: 0 }, { g: 'z', v: 0 }], [{ kind: 'normalize', field: 'v', groupBy: ['g'], as: 's' }]);
    // 组和为 0 → share 0（不产 NaN / Infinity）
    expect(out.every(r => r.s === 0)).toBe(true);
  });

  // 交互：normalize → stack = 百分比堆叠（每组 y1 上界 = 100）
  it('normalize_then_stack_percentage_stacking', () => {
    const out = applyTransforms(REVENUE, [
      { kind: 'normalize', field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' },
      { kind: 'stack', x: 'quarter', y: 'share', groupBy: 'product' },
    ]);
    // 每个 quarter 组最终 y1 上界 = 100
    for (const q of ['Q1', 'Q2']) {
      const top = Math.max(...out.filter(r => r.quarter === q).map(r => r.y1 as number));
      expect(top).toBeCloseTo(100, 9);
    }
  });
});

// alpha.12 ADR-02：derive-interval（单行派生区间，保行数）
describe('applyDeriveInterval (alpha.12 ADR-02)', () => {
  it('derive_interval_two_field', () => {
    const tasks = [{ task: 'A', start: 1, end: 5 }, { task: 'B', start: 3, end: 9 }];
    const out = applyTransforms(tasks, [{ kind: 'derive-interval', startFrom: 'start', endFrom: 'end' }]);
    expect(out.length).toBe(2);
    expect(out[0]).toMatchObject({ y0: 1, y1: 5 });
    expect(out[1]).toMatchObject({ y0: 3, y1: 9 });
  });

  it('derive_interval_from_baseline', () => {
    const out = applyTransforms([{ v: 8 }], [{ kind: 'derive-interval', from: 'v', baseline: 2 }]);
    expect(out[0]).toMatchObject({ y0: 2, y1: 8 });
  });

  it('derive_interval_custom_fields', () => {
    const out = applyTransforms([{ s: 1, e: 4 }], [{ kind: 'derive-interval', startFrom: 's', endFrom: 'e', startField: 'lo', endField: 'hi' }]);
    expect(out[0]).toMatchObject({ lo: 1, hi: 4 });
  });

  it('derive_interval_no_source_fail_loud', () => {
    expect(() => applyTransforms([{ v: 1 }], [{ kind: 'derive-interval' }])).toThrow(/from|startFrom|endFrom/);
  });

  // derive-interval（单行）vs stack（跨行累积）产不同 y0/y1
  it('derive_interval_vs_stack_distinct', () => {
    const rows = [{ x: 'a', v: 3 }, { x: 'a', v: 5 }];
    const derived = applyTransforms(rows, [{ kind: 'derive-interval', from: 'v' }]);
    const stacked = applyTransforms(rows, [{ kind: 'stack', x: 'x', y: 'v' }]);
    // derive：每行独立 [0,v]；stack：跨行累积 [0,3],[3,8]
    expect(derived.map(r => [r.y0, r.y1])).toEqual([[0, 3], [0, 5]]);
    expect(stacked.map(r => [r.y0, r.y1])).toEqual([[0, 3], [3, 8]]);
  });
});

// alpha.12 ADR-02：jitter（确定性位置抖动，保行数）
describe('applyJitter (alpha.12 ADR-02)', () => {
  const SAMPLES: Array<ExternalRow> = [{ dose: 1, r: 10 }, { dose: 1, r: 12 }, { dose: 2, r: 8 }];

  it('jitter_deterministic_same_seed', () => {
    const op = { kind: 'jitter', axis: 'x', xField: 'dose', amount: 0.3, seed: 42 } as const;
    const a = applyTransforms(SAMPLES, [op]);
    const b = applyTransforms(SAMPLES, [op]);
    expect(a.map(r => r.dose)).toEqual(b.map(r => r.dose));
    // 偏移在 ±amount 内
    a.forEach((r, i) => expect(Math.abs((r.dose as number) - (SAMPLES[i].dose as number))).toBeLessThanOrEqual(0.3 + 1e-9));
  });

  it('jitter_different_seed_differs', () => {
    const a = applyTransforms(SAMPLES, [{ kind: 'jitter', axis: 'x', xField: 'dose', amount: 0.3, seed: 1 }]);
    const b = applyTransforms(SAMPLES, [{ kind: 'jitter', axis: 'x', xField: 'dose', amount: 0.3, seed: 2 }]);
    expect(a.map(r => r.dose)).not.toEqual(b.map(r => r.dose));
  });

  it('jitter_preserves_row_count_and_other_fields', () => {
    const out = applyTransforms(SAMPLES, [{ kind: 'jitter', axis: 'x', xField: 'dose', amount: 0.3, seed: 5 }]);
    expect(out.length).toBe(SAMPLES.length);
    // 非抖字段 r 不变
    expect(out.map(r => r.r)).toEqual(SAMPLES.map(r => r.r));
  });

  it('jitter_amount_zero_is_identity', () => {
    const out = applyTransforms(SAMPLES, [{ kind: 'jitter', axis: 'x', xField: 'dose', amount: 0, seed: 9 }]);
    expect(out.map(r => r.dose)).toEqual(SAMPLES.map(r => r.dose));
  });

  it('jitter_both_axes', () => {
    const out = applyTransforms([{ x: 0, y: 0 }], [{ kind: 'jitter', axis: 'both', amount: 1, seed: 3 }]);
    expect(typeof out[0].x).toBe('number');
    expect(typeof out[0].y).toBe('number');
  });

  it('jitter_non_finite_value_skipped', () => {
    const out = applyTransforms([{ dose: 'NA', r: 1 }], [{ kind: 'jitter', axis: 'x', xField: 'dose', amount: 1, seed: 0 }]);
    // 非有限值保持原值（不产 NaN）
    expect(out[0].dose).toBe('NA');
  });
});
