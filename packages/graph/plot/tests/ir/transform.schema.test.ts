import { describe, expect, it } from 'vitest';

import { PlotSpecSchema } from '../../src/schemas';
import { BuiltinTransformSchema, TransformSchema } from '../../src/schemas/transform';

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

  it('stack_offset_valid', () => {
    const t = { kind: 'stack', x: 'm', y: 'r', groupBy: 'p', offset: 'diverging' };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  // 错误路径
  it('builtin_transform_unknown_kind_rejected', () => {
    expect(() => BuiltinTransformSchema.parse({ kind: 'filter', field: 'm' })).toThrow();
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

describe('TransformSchema external operations (alpha.12 ADR-06)', () => {
  it('builtin_bad_shape_static_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin' })).toThrow();
  });

  it('external_kind_passthrough_valid', () => {
    const operation = { kind: 'regression', x: 'year', y: 'value', degree: 1 };
    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it('external_kind_cannot_collide_with_builtin', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', custom: true })).toThrow(/built-in/i);
  });

  it('external_operation_json_roundtrip_equivalent', () => {
    const operation = { kind: 'regression', x: 'year', y: 'value', options: { robust: false, weights: [1, 2, 3] } };
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('external_operation_rejects_non_json_values', () => {
    expect(() => TransformSchema.parse({ kind: 'regression', fn: () => 1 })).toThrow(/JSON-serializable/i);
    expect(() => TransformSchema.parse({ kind: 'regression', value: undefined })).toThrow(/JSON-serializable/i);
    expect(() => TransformSchema.parse({ kind: 'regression', value: Number.NaN })).toThrow(/JSON-serializable/i);
    expect(() => TransformSchema.parse({ kind: 'regression', value: Infinity })).toThrow(/JSON-serializable/i);
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
    const t = { kind: 'bin', field: 'measurement', count: 20, metrics: [{ op: 'count', as: 'binCount' }] };
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
      startField: 'lo',
      endField: 'hi',
      metrics: [{ op: 'mean', field: 'weight', as: 'avg' }],
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

  it('bin_old_reduce_shape_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', field: 'x', reduce: 'sum', reduceField: 'weight' })).toThrow();
  });

  it('bin_json_roundtrip_equivalent', () => {
    const t = {
      kind: 'bin',
      field: 'measurement',
      thresholds: [1, 2, 3],
      metrics: [{ op: 'sum', field: 'w', as: 'totalWeight' }],
    };
    const round = TransformSchema.parse(JSON.parse(JSON.stringify(t)));
    expect(round).toEqual(t);
  });
});

describe('Statistical transform algebra schema (alpha.12 ADR-16)', () => {
  it('summarize_multiple_metrics_valid', () => {
    const operation = {
      kind: 'summarize',
      groupBy: ['region'],
      metrics: [
        { op: 'mean', field: 'revenue', as: 'avgRevenue' },
        { op: 'median', field: 'revenue', as: 'medianRevenue' },
        { op: 'count', as: 'orders' },
      ],
    };
    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it('summarize_requires_metric_as', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        groupBy: ['region'],
        metrics: [{ op: 'mean', field: 'revenue' }],
      }),
    ).toThrow();
  });

  it('select_max_requires_by', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'select',
        groupBy: ['series'],
        selector: { op: 'max' },
      }),
    ).toThrow();
  });

  it('relate_json_roundtrip_equivalent', () => {
    const operation = {
      kind: 'relate',
      groupBy: ['series'],
      source: { selector: { op: 'min', by: 'value' }, fields: { x: 'month', y: 'value', id: 'id' } },
      target: { selector: { op: 'max', by: 'value' }, fields: { x: 'month', y: 'value', id: 'id' } },
      measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel' }],
    };
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('bin_uses_shared_metrics_and_rejects_old_reduce_shape', () => {
    const operation = {
      kind: 'bin',
      field: 'measurement',
      step: 10,
      metrics: [
        { op: 'count', as: 'binCount' },
        { op: 'mean', field: 'weight', as: 'binMean' },
      ],
    };
    expect(TransformSchema.parse(operation)).toEqual(operation);
    expect(() =>
      TransformSchema.parse({ kind: 'bin', field: 'measurement', reduce: 'sum', reduceField: 'weight' }),
    ).toThrow();
  });

  it('old_aggregate_and_derive_relation_rejected', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue', as: 'total' }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'derive-relation',
        source: { select: 'min', by: 'value', fields: { id: 'id' } },
        target: { select: 'max', by: 'value', fields: { id: 'id' } },
      }),
    ).toThrow();
  });
});

describe('SummarizeTransformSchema (alpha.12 ADR-16)', () => {
  it('summarize_sum_valid', () => {
    const t = {
      kind: 'summarize',
      groupBy: ['region'],
      metrics: [{ op: 'sum', field: 'revenue', as: 'totalRevenue' }],
    };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('summarize_count_valid', () => {
    const t = { kind: 'summarize', groupBy: ['region', 'product'], metrics: [{ op: 'count', as: 'count' }] };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('summarize_global_group_valid', () => {
    const t = { kind: 'summarize', metrics: [{ op: 'sum', field: 'revenue', as: 'totalRevenue' }] };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('summarize_empty_groupby_valid', () => {
    const t = { kind: 'summarize', groupBy: [], metrics: [{ op: 'sum', field: 'r', as: 'total' }] };
    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('summarize_groupby_non_array_rejected', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        groupBy: 'region',
        metrics: [{ op: 'sum', field: 'r', as: 'total' }],
      }),
    ).toThrow();
  });

  it('summarize_duplicate_metric_output_rejected', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        groupBy: ['r'],
        metrics: [
          { op: 'sum', field: 'x', as: 'value' },
          { op: 'mean', field: 'x', as: 'value' },
        ],
      }),
    ).toThrow();
  });

  it('summarize_json_roundtrip_equivalent', () => {
    const t = { kind: 'summarize', groupBy: ['region'], metrics: [{ op: 'mean', field: 'revenue', as: 'avgRevenue' }] };
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

describe('DensityTransformSchema (alpha.13 ADR-03)', () => {
  it('density_full_form_valid_and_json_roundtrip_equivalent', () => {
    const operation = {
      kind: 'density',
      field: 'value',
      groupBy: ['species'],
      bandwidth: { kind: 'silverman' },
      sampleCount: 96,
      extent: [0, 10],
      xAs: 'densityX',
      densityAs: 'density',
    };
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('density_explicit_bandwidth_valid', () => {
    const operation = {
      kind: 'density',
      field: 'value',
      bandwidth: { kind: 'value', value: 2 },
      xAs: 'x',
      densityAs: 'd',
    };
    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it('density_requires_output_fields', () => {
    expect(() => TransformSchema.parse({ kind: 'density', field: 'value', densityAs: 'density' })).toThrow();
    expect(() => TransformSchema.parse({ kind: 'density', field: 'value', xAs: 'densityX' })).toThrow();
  });

  it('density_rejects_output_collisions', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'density', field: 'value', xAs: 'density', densityAs: 'density' }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'density',
        field: 'value',
        groupBy: ['species'],
        xAs: 'species',
        densityAs: 'density',
      }),
    ).toThrow();
  });

  it('density_rejects_invalid_extent_and_bandwidth', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'density', field: 'value', extent: [10, 0], xAs: 'x', densityAs: 'd' }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'density',
        field: 'value',
        bandwidth: { kind: 'value', value: 0 },
        xAs: 'x',
        densityAs: 'd',
      }),
    ).toThrow();
  });
});

describe('SmoothTransformSchema (alpha.13 ADR-04)', () => {
  it('smooth_full_form_valid_and_json_roundtrip_equivalent', () => {
    const operation = {
      kind: 'smooth',
      x: 'time',
      y: 'value',
      groupBy: ['series'],
      method: { kind: 'linear' },
      sampleCount: 96,
      extent: [0, 10],
      xAs: 'trendX',
      yAs: 'trendY',
    };
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('smooth_minimal_linear_valid', () => {
    const operation = {
      kind: 'smooth',
      x: 'time',
      y: 'value',
      xAs: 'trendX',
      yAs: 'trendY',
    };
    expect(BuiltinTransformSchema.parse(operation)).toEqual(operation);
  });

  it('smooth_requires_output_fields', () => {
    expect(() => TransformSchema.parse({ kind: 'smooth', x: 'time', y: 'value', yAs: 'trendY' })).toThrow();
    expect(() => TransformSchema.parse({ kind: 'smooth', x: 'time', y: 'value', xAs: 'trendX' })).toThrow();
  });

  it('smooth_rejects_output_collisions', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'smooth', x: 'time', y: 'value', xAs: 'trend', yAs: 'trend' }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'smooth',
        x: 'time',
        y: 'value',
        groupBy: ['series'],
        xAs: 'series',
        yAs: 'trendY',
      }),
    ).toThrow();
  });

  it('smooth_rejects_invalid_extent_and_method', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'smooth', x: 'time', y: 'value', extent: [10, 0], xAs: 'trendX', yAs: 'trendY' }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'smooth',
        x: 'time',
        y: 'value',
        method: { kind: 'loess' },
        xAs: 'trendX',
        yAs: 'trendY',
      }),
    ).toThrow();
  });
});
