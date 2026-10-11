import { describe, expect, it } from 'vitest';

import {
  resolveRegression,
  ExternalTransformSchema,
  TransformSchema,
  SortTransformSchema,
  BinTransformSchema,
} from '../../src';
import { BuiltinTransformSchema } from '../../src/schemas/transform';

describe('TransformSchema sort / stack', () => {
  // Happy path
  it('sort_schema_valid', () => {
    const t = { kind: 'sort', params: { field: 'month' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('sort_with_order_valid', () => {
    const t = { kind: 'sort', params: { field: 'month', order: 'descending' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_schema_valid', () => {
    const t = { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_custom_output_fields_valid', () => {
    const t = { kind: 'stack', params: { x: 'm', y: 'r', groupBy: 'p', startField: 'lo', endField: 'hi' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_offset_valid', () => {
    const t = { kind: 'stack', params: { x: 'm', y: 'r', groupBy: 'p', offset: 'diverging' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  // 错误路径
  it('builtin_transform_unknown_kind_rejected', () => {
    expect(() => BuiltinTransformSchema.parse({ kind: 'filter', field: 'm' })).toThrow();
  });

  it('sort_missing_field_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', params: {} })).toThrow();
  });

  it('sort_bad_order_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', params: { field: 'm', order: 'up' } })).toThrow();
  });

  it('stack_missing_y_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'stack', params: { x: 'm', groupBy: 'p' } })).toThrow();
  });

  // stack 允许省略 x / groupBy，用于单链累积场景
  it('stack_omits_x_and_group_valid', () => {
    // 单链累积：只给 y，按数据序累加（饼图用法）
    const t = { kind: 'stack', params: { y: 'value' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_omits_only_group_valid', () => {
    const t = { kind: 'stack', params: { x: 'month', y: 'value' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_omits_only_x_valid', () => {
    const t = { kind: 'stack', params: { y: 'value', groupBy: 'product' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_full_form_still_valid', () => {
    // 回归：原有完整堆叠柱写法（x + groupBy）依旧通过
    const t = { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_single_chain_with_custom_fields_valid', () => {
    const t = { kind: 'stack', params: { y: 'value', startField: 'lo', endField: 'hi' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('stack_omitting_y_still_rejected', () => {
    // y 仍必填（累积的值字段）
    expect(() => TransformSchema.parse({ kind: 'stack', params: {} })).toThrow();
  });
});

describe('TransformSchema external operations', () => {
  it('builtin_bad_shape_static_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: {} })).toThrow();
  });

  it('external_kind_open_config_valid', () => {
    const operation = { kind: 'regression', params: { x: 'year', y: 'value', degree: 1 } };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it('external_kind_cannot_collide_with_builtin', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { custom: true } })).toThrow(/built-in/i);
  });

  it('external_operation_json_roundtrip_equivalent', () => {
    const operation = {
      kind: 'regression',
      params: { x: 'year', y: 'value', options: { robust: false, weights: [1, 2, 3] } },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it.each([
    ['function', () => 1],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['Infinity', Infinity],
  ])('external_operation_reports_deep_non_json_value_path: %s', (_name, value) => {
    const result = ExternalTransformSchema.safeParse({
      kind: 'regression',
      params: {
        payload: { nested: [0, { bad: value }] },
      },
    });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.at(0)?.path).toEqual(['params', 'payload']);
  });
});

describe('BinTransformSchema', () => {
  it('bin_count_strategy_valid', () => {
    const t = {
      kind: 'bin',
      params: { field: 'measurement', count: 20, metrics: [{ kind: 'count', as: 'binCount' }] },
    };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_step_strategy_valid', () => {
    const t = { kind: 'bin', params: { field: 'x', step: 5 } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_thresholds_strategy_valid', () => {
    const t = { kind: 'bin', params: { field: 'x', thresholds: [10, 20, 30] } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_full_form_valid', () => {
    const t = {
      kind: 'bin',
      params: {
        field: 'measurement',
        count: 10,
        extent: [0, 100] as [number, number],
        nice: false,
        startField: 'lo',
        endField: 'hi',
        metrics: [{ kind: 'mean', field: 'weight', as: 'avg' }],
      },
    };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_minimal_valid', () => {
    const t = { kind: 'bin', params: { field: 'measurement' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin_missing_field_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { count: 10 } })).toThrow();
  });

  it('bin_count_non_integer_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { field: 'x', count: 3.5 } })).toThrow();
  });

  it('bin_step_non_positive_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { field: 'x', step: 0 } })).toThrow();
  });

  it('bin_old_reduce_shape_rejected', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'bin', params: { field: 'x', reduce: 'sum', reduceField: 'weight' } }),
    ).toThrow();
  });

  it('bin_json_roundtrip_equivalent', () => {
    const t = {
      kind: 'bin',
      params: {
        field: 'measurement',
        thresholds: [1, 2, 3],
        metrics: [{ kind: 'sum', field: 'w', as: 'totalWeight' }],
      },
    };
    const round = TransformSchema.parse(JSON.parse(JSON.stringify(t)));

    expect(round).toEqual(t);
  });
});

describe('Statistical transform algebra schema', () => {
  it('summarize_multiple_metrics_valid', () => {
    const operation = {
      kind: 'summarize',
      params: {
        groupBy: ['region'],
        metrics: [
          { kind: 'mean', field: 'revenue', as: 'avgRevenue' },
          { kind: 'median', field: 'revenue', as: 'medianRevenue' },
          { kind: 'count', as: 'orders' },
        ],
      },
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it('summarize_requires_metric_as', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          groupBy: ['region'],
          metrics: [{ kind: 'mean', field: 'revenue' }],
        },
      }),
    ).toThrow();
  });

  it('select_max_requires_by', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'select',
        params: {
          groupBy: ['series'],
          selector: { kind: 'max' },
        },
      }),
    ).toThrow();
  });

  it('relate_json_roundtrip_equivalent', () => {
    const operation = {
      kind: 'relate',
      params: {
        groupBy: ['series'],
        source: { selector: { kind: 'min', by: 'value' }, fields: { x: 'month', y: 'value', id: 'id' } },
        target: { selector: { kind: 'max', by: 'value' }, fields: { x: 'month', y: 'value', id: 'id' } },
        measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel' }],
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('bin_uses_shared_metrics_and_rejects_old_reduce_shape', () => {
    const operation = {
      kind: 'bin',
      params: {
        field: 'measurement',
        step: 10,
        metrics: [
          { kind: 'count', as: 'binCount' },
          { kind: 'mean', field: 'weight', as: 'binMean' },
        ],
      },
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
    expect(() =>
      TransformSchema.parse({ kind: 'bin', params: { field: 'measurement', reduce: 'sum', reduceField: 'weight' } }),
    ).toThrow();
  });
});

describe('SummarizeTransformSchema', () => {
  it('summarize_sum_valid', () => {
    const t = {
      kind: 'summarize',
      params: {
        groupBy: ['region'],
        metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
      },
    };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('summarize_count_valid', () => {
    const t = {
      kind: 'summarize',
      params: { groupBy: ['region', 'product'], metrics: [{ kind: 'count', as: 'count' }] },
    };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('summarize_global_group_valid', () => {
    const t = { kind: 'summarize', params: { metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }] } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('summarize_empty_groupby_valid', () => {
    const t = { kind: 'summarize', params: { groupBy: [], metrics: [{ kind: 'sum', field: 'r', as: 'total' }] } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('summarize_groupby_non_array_rejected', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          groupBy: 'region',
          metrics: [{ kind: 'sum', field: 'r', as: 'total' }],
        },
      }),
    ).toThrow();
  });

  it('summarize_duplicate_metric_output_rejected', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          groupBy: ['r'],
          metrics: [
            { kind: 'sum', field: 'x', as: 'value' },
            { kind: 'mean', field: 'x', as: 'value' },
          ],
        },
      }),
    ).toThrow();
  });

  it('summarize_json_roundtrip_equivalent', () => {
    const t = {
      kind: 'summarize',
      params: {
        groupBy: ['region'],
        metrics: [{ kind: 'mean', field: 'revenue', as: 'avgRevenue' }],
      },
    };
    const round = TransformSchema.parse(JSON.parse(JSON.stringify(t)));

    expect(round).toEqual(t);
  });
});

describe('NormalizeTransformSchema', () => {
  it('normalize_full_form_valid', () => {
    const t = { kind: 'normalize', params: { field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('normalize_minimal_valid', () => {
    const t = { kind: 'normalize', params: { field: 'amount' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('normalize_missing_field_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'normalize', params: { groupBy: ['q'] } })).toThrow();
  });

  it('normalize_groupby_non_array_rejected', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'normalize', params: { field: 'amount', groupBy: 'quarter' } }),
    ).toThrow();
  });

  it('normalize_bad_basis_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'normalize', params: { field: 'amount', basis: 'ratio' } })).toThrow();
  });
});

describe('DeriveIntervalTransformSchema', () => {
  it('derive_interval_two_field_valid', () => {
    const t = { kind: 'derive-interval', params: { startFrom: 'start', endFrom: 'end' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('derive_interval_from_baseline_valid', () => {
    const t = { kind: 'derive-interval', params: { from: 'value', baseline: 10, startField: 'lo', endField: 'hi' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('derive_interval_non_finite_baseline_rejected', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'derive-interval', params: { from: 'v', baseline: Infinity } }),
    ).toThrow();
  });

  it('derive_interval_json_roundtrip_equivalent', () => {
    const t = { kind: 'derive-interval', params: { startFrom: 's', endFrom: 'e', startField: 'a', endField: 'b' } };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
});

describe('JitterTransformSchema', () => {
  it('jitter_full_form_valid', () => {
    const t = { kind: 'jitter', params: { axis: 'x', xField: 'dose', amount: 0.3, seed: 42 } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('jitter_minimal_valid', () => {
    const t = { kind: 'jitter', params: {} };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('jitter_seed_non_integer_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'jitter', params: { seed: 1.5 } })).toThrow();
  });

  it('jitter_negative_amount_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'jitter', params: { amount: -1 } })).toThrow();
  });

  it('jitter_bad_axis_rejected', () => {
    expect(() => TransformSchema.parse({ kind: 'jitter', params: { axis: 'z' } })).toThrow();
  });

  it('jitter_json_roundtrip_equivalent', () => {
    const t = { kind: 'jitter', params: { axis: 'both', xField: 'dx', yField: 'dy', amount: 2, seed: 7 } };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
});

describe('DensityTransformSchema', () => {
  it('density_full_form_valid_and_json_roundtrip_equivalent', () => {
    const operation = {
      kind: 'density',
      params: {
        field: 'value',
        groupBy: ['species'],
        bandwidth: { kind: 'silverman' },
        sampleCount: 96,
        extent: [0, 10],
        xAs: 'densityX',
        densityAs: 'density',
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('density_explicit_bandwidth_valid', () => {
    const operation = {
      kind: 'density',
      params: {
        field: 'value',
        bandwidth: { kind: 'value', value: 2 },
        xAs: 'x',
        densityAs: 'd',
      },
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it.each([
    ['xAs', { kind: 'density', params: { field: 'value', densityAs: 'density' } }],
    ['densityAs', { kind: 'density', params: { field: 'value', xAs: 'densityX' } }],
  ])('density_requires_output_field: %s', (_field, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    ['xAs matches densityAs', { kind: 'density', params: { field: 'value', xAs: 'density', densityAs: 'density' } }],
    [
      'xAs matches groupBy',
      {
        kind: 'density',
        params: {
          field: 'value',
          groupBy: ['species'],
          xAs: 'species',
          densityAs: 'density',
        },
      },
    ],
  ])('density_rejects_output_collision: %s', (_name, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    ['extent order', { kind: 'density', params: { field: 'value', extent: [10, 0], xAs: 'x', densityAs: 'd' } }],
    [
      'bandwidth value',
      {
        kind: 'density',
        params: {
          field: 'value',
          bandwidth: { kind: 'value', value: 0 },
          xAs: 'x',
          densityAs: 'd',
        },
      },
    ],
  ])('density_rejects_invalid_%s', (_name, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });
});

describe('SmoothTransformSchema', () => {
  it('smooth_full_form_valid_and_json_roundtrip_equivalent', () => {
    const operation = {
      kind: 'smooth',
      params: {
        x: 'time',
        y: 'value',
        groupBy: ['series'],
        method: { kind: 'linear' },
        sampleCount: 96,
        extent: [0, 10],
        xAs: 'trendX',
        yAs: 'trendY',
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('smooth_minimal_linear_valid', () => {
    const operation = {
      kind: 'smooth',
      params: {
        x: 'time',
        y: 'value',
        xAs: 'trendX',
        yAs: 'trendY',
      },
    };

    expect(BuiltinTransformSchema.parse(operation)).toEqual(operation);
  });

  it.each([
    ['linear', { kind: 'linear' }],
    ['quadratic', { kind: 'quadratic' }],
    ['polynomial default order', { kind: 'polynomial' }],
    ['polynomial order 2', { kind: 'polynomial', order: 2 }],
    ['polynomial order 3', { kind: 'polynomial', order: 3 }],
    ['polynomial order 6', { kind: 'polynomial', order: 6 }],
    ['logarithmic', { kind: 'logarithmic' }],
    ['exponential', { kind: 'exponential' }],
    ['power', { kind: 'power' }],
  ])('smooth_accepts_complete_method_variant: %s', (_name, method) => {
    const operation = {
      kind: 'smooth',
      params: {
        x: 'time',
        y: 'value',
        method,
        xAs: 'trendX',
        yAs: 'trendY',
      },
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it.each([
    ['xAs', { kind: 'smooth', params: { x: 'time', y: 'value', yAs: 'trendY' } }],
    ['yAs', { kind: 'smooth', params: { x: 'time', y: 'value', xAs: 'trendX' } }],
  ])('smooth_requires_output_field: %s', (_field, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    ['xAs matches yAs', { kind: 'smooth', params: { x: 'time', y: 'value', xAs: 'trend', yAs: 'trend' } }],
    [
      'xAs matches groupBy',
      {
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          groupBy: ['series'],
          xAs: 'series',
          yAs: 'trendY',
        },
      },
    ],
  ])('smooth_rejects_output_collision: %s', (_name, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    [
      'extent order',
      { kind: 'smooth', params: { x: 'time', y: 'value', extent: [10, 0], xAs: 'trendX', yAs: 'trendY' } },
    ],
    [
      'method kind',
      {
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          method: { kind: '' },
          xAs: 'trendX',
          yAs: 'trendY',
        },
      },
    ],
  ])('smooth_rejects_invalid_%s', (_name, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    ['polynomial order below minimum', { kind: 'polynomial', order: 1 }],
    ['polynomial order above maximum', { kind: 'polynomial', order: 7 }],
    ['polynomial non-integer order', { kind: 'polynomial', order: 2.5 }],
    ['short logarithmic name', { kind: 'log' }],
    ['short exponential name', { kind: 'exp' }],
    ['unknown method field', { kind: 'quadratic', order: 2 }],
    ['linear method options', { kind: 'linear', order: 2 }],
  ])('smooth_rejects_invalid_method_variant: %s', (_name, method) => {
    expect(() => resolveRegression(method)).toThrow();
  });
});

describe('transform grouping schema', () => {
  it.each(['sort', 'bin'])('round-trips %s grouping without materializing defaults', kind => {
    for (const groupBy of [[], ['team', 'item']]) {
      const operation = { kind, params: { field: 'value', groupBy } };
      expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
    }
  });
  it.each(['sort', 'bin'])('rejects invalid %s grouping at the parameter path', kind => {
    for (const groupBy of ['team', [' ']]) {
      const schema = kind === 'sort' ? SortTransformSchema : BinTransformSchema;
      const result = schema.safeParse({ kind, params: { field: 'value', groupBy } });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.some(issue => issue.path.includes('groupBy'))).toBe(true);
    }
  });
  it.each(['value', 'binStart', 'binEnd', 'binCount'])('rejects bin output collision with group %s', field => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { field: 'value', groupBy: [field] } })).toThrow(
      /groupBy/,
    );
  });
  it('rejects named boundary and multi-output reducer collisions', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'bin', params: { field: 'value', groupBy: ['team'], startField: 'team' } }),
    ).toThrow(/groupBy/);
    expect(() =>
      TransformSchema.parse({
        kind: 'bin',
        params: {
          field: 'value',
          groupBy: ['team'],
          metrics: [{ kind: 'extent', field: 'value', as: { min: 'team', max: 'hi' } }],
        },
      }),
    ).toThrow(/groupBy/);
  });
});
