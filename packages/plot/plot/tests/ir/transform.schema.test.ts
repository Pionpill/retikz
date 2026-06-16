import { describe, expect, it } from 'vitest';
import { TransformSchema } from '../../src/ir/transform';

describe('TransformSchema (ADR-03)', () => {
  // Happy path
  it('sort_schema_valid', () => {
    const t = { kind: 'sort', field: 'month' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('sort_with_order_valid', () => {
    const t = { kind: 'sort', field: 'month', order: 'descending' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_schema_valid', () => {
    const t = { kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_custom_output_fields_valid', () => {
    const t = { kind: 'stack', x: 'm', y: 'r', groupBy: 'p', startField: 'lo', endField: 'hi' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  // 错误路径
  it('transform_unknown_kind_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'filter', field: 'm' })).toThrow();
  });

  it('sort_missing_field_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'sort' })).toThrow();
  });

  it('sort_bad_order_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', field: 'm', order: 'up' })).toThrow();
  });

  it('stack_missing_y_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'stack', x: 'm', groupBy: 'p' })).toThrow();
  });

  // ADR-02：泛化 stack —— x / groupBy 转可选（缺省单链累积，喂饼图）
  it('stack_omits_x_and_group_valid', () => {
    // 单链累积：只给 y，按数据序累加（饼图用法）
    const t = { kind: 'stack', y: 'value' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_omits_only_group_valid', () => {
    const t = { kind: 'stack', x: 'month', y: 'value' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_omits_only_x_valid', () => {
    const t = { kind: 'stack', y: 'value', groupBy: 'product' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_full_form_still_valid', () => {
    // 回归：原有完整堆叠柱写法（x + groupBy）依旧通过
    const t = { kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_single_chain_with_custom_fields_valid', () => {
    const t = { kind: 'stack', y: 'value', startField: 'lo', endField: 'hi' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_omitting_y_still_rejected', () => {
    // y 仍必填（累积的值字段）
    expect(() => TransformSchema.parse({ kind: 'stack' })).toThrow();
  });
});

describe('BinTransformSchema (alpha.12 ADR-01)', () => {
  it('bin_count_strategy_valid', () => {
    const t = { kind: 'bin', field: 'measurement', count: 20, reduce: 'count' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_step_strategy_valid', () => {
    const t = { kind: 'bin', field: 'x', step: 5 };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_thresholds_strategy_valid', () => {
    const t = { kind: 'bin', field: 'x', thresholds: [10, 20, 30] };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_full_form_valid', () => {
    const t = {
      kind: 'bin',
      field: 'measurement',
      count: 10,
      extent: [0, 100] as [number, number],
      nice: false,
      reduce: 'mean',
      reduceField: 'weight',
      startField: 'lo',
      endField: 'hi',
      valueField: 'avg',
    };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_minimal_valid', () => {
    const t = { kind: 'bin', field: 'measurement' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_missing_field_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', count: 10 })).toThrow();
  });

  it('bin_count_non_integer_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', field: 'x', count: 3.5 })).toThrow();
  });

  it('bin_step_non_positive_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', field: 'x', step: 0 })).toThrow();
  });

  it('bin_bad_reduce_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', field: 'x', reduce: 'median' })).toThrow();
  });

  it('bin_json_roundtrip_equivalent', () => {
    const t = { kind: 'bin', field: 'measurement', thresholds: [1, 2, 3], reduce: 'sum', reduceField: 'w' };
    const round = TransformSchema.parse(JSON.parse(JSON.stringify(t)));
    expect(round).toEqual(t);
  });
});

describe('AggregateTransformSchema (alpha.12 ADR-01)', () => {
  it('aggregate_sum_valid', () => {
    const t = { kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue', as: 'totalRevenue' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('aggregate_count_valid', () => {
    const t = { kind: 'aggregate', groupBy: ['region', 'product'], reduce: 'count' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('aggregate_missing_groupby_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'aggregate', reduce: 'sum', field: 'r' })).toThrow();
  });

  it('aggregate_empty_groupby_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'aggregate', groupBy: [], reduce: 'sum', field: 'r' })).toThrow();
  });

  it('aggregate_groupby_non_array_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'aggregate', groupBy: 'region', reduce: 'sum', field: 'r' })).toThrow();
  });

  it('aggregate_bad_reduce_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'aggregate', groupBy: ['r'], reduce: 'median', field: 'x' })).toThrow();
  });

  it('aggregate_json_roundtrip_equivalent', () => {
    const t = { kind: 'aggregate', groupBy: ['region'], reduce: 'mean', field: 'revenue' };
    const round = TransformSchema.parse(JSON.parse(JSON.stringify(t)));
    expect(round).toEqual(t);
  });
});
