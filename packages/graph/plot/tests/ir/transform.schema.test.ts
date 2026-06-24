import { describe, expect, it } from 'vitest';
import { PlotSpecSchema } from '../../src/schemas';
import { TransformOperationSchema, TransformSchema } from '../../src/schemas/transform';

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

describe('TransformOperationSchema (alpha.12 ADR-06)', () => {
  it('builtin_bad_shape_static_rejected', () => {
    expect(() => TransformOperationSchema.parse({ kind: 'bin' })).toThrow();
  });

  it('custom_kind_passthrough_valid', () => {
    const operation = { kind: 'regression', x: 'year', y: 'value', degree: 1 };
    expect(TransformOperationSchema.parse(operation)).toEqual(operation);
  });

  it('custom_kind_cannot_collide_with_builtin', () => {
    expect(() => TransformOperationSchema.parse({ kind: 'bin', custom: true })).toThrow(/built-in/i);
  });

  it('custom_operation_json_roundtrip_equivalent', () => {
    const operation = { kind: 'regression', x: 'year', y: 'value', options: { robust: false, weights: [1, 2, 3] } };
    expect(TransformOperationSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('custom_operation_rejects_non_json_values', () => {
    expect(() => TransformOperationSchema.parse({ kind: 'regression', fn: () => 1 })).toThrow(/JSON-serializable/i);
    expect(() => TransformOperationSchema.parse({ kind: 'regression', value: undefined })).toThrow(/JSON-serializable/i);
    expect(() => TransformOperationSchema.parse({ kind: 'regression', value: Number.NaN })).toThrow(/JSON-serializable/i);
    expect(() => TransformOperationSchema.parse({ kind: 'regression', value: Infinity })).toThrow(/JSON-serializable/i);
  });

  it('plot_spec_transform_accepts_custom_operation', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      transform: [{ kind: 'regression', x: 'year', y: 'value' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      marks: [{ type: 'point', encoding: { x: { field: 'year' }, y: { field: 'value' } } }],
    };
    expect(PlotSpecSchema.parse(spec).transform).toEqual(spec.transform);
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

describe('NormalizeTransformSchema (alpha.12 ADR-02)', () => {
  it('normalize_full_form_valid', () => {
    const t = { kind: 'normalize', field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('normalize_minimal_valid', () => {
    const t = { kind: 'normalize', field: 'amount' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('normalize_missing_field_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'normalize', groupBy: ['q'] })).toThrow();
  });

  it('normalize_groupby_non_array_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'normalize', field: 'amount', groupBy: 'quarter' })).toThrow();
  });

  it('normalize_bad_basis_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'normalize', field: 'amount', basis: 'ratio' })).toThrow();
  });
});

describe('DeriveIntervalTransformSchema (alpha.12 ADR-02)', () => {
  it('derive_interval_two_field_valid', () => {
    const t = { kind: 'derive-interval', startFrom: 'start', endFrom: 'end' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('derive_interval_from_baseline_valid', () => {
    const t = { kind: 'derive-interval', from: 'value', baseline: 10, startField: 'lo', endField: 'hi' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('derive_interval_non_finite_baseline_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'derive-interval', from: 'v', baseline: Infinity })).toThrow();
  });

  it('derive_interval_json_roundtrip_equivalent', () => {
    const t = { kind: 'derive-interval', startFrom: 's', endFrom: 'e', startField: 'a', endField: 'b' };
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
});

describe('JitterTransformSchema (alpha.12 ADR-02)', () => {
  it('jitter_full_form_valid', () => {
    const t = { kind: 'jitter', axis: 'x', xField: 'dose', amount: 0.3, seed: 42 };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('jitter_minimal_valid', () => {
    const t = { kind: 'jitter' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('jitter_seed_non_integer_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'jitter', seed: 1.5 })).toThrow();
  });

  it('jitter_negative_amount_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'jitter', amount: -1 })).toThrow();
  });

  it('jitter_bad_axis_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'jitter', axis: 'z' })).toThrow();
  });

  it('jitter_json_roundtrip_equivalent', () => {
    const t = { kind: 'jitter', axis: 'both', xField: 'dx', yField: 'dy', amount: 2, seed: 7 };
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
});
