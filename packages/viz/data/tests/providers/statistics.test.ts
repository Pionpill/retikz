import { describe, expect, it } from 'vitest';
import { literal, strictObject, string, unknown } from 'zod';

import {
  applyReducerOperation,
  applySelectorOperation,
  BuiltinReducerOperationSchemas,
  BuiltinSelectorOperationSchemas,
  DataFieldType,
  DEFAULT_TRANSFORM_CONTEXT,
  defineRowSelector,
  defineStatisticsReducer,
  ReducerOperationKind,
  ReducerOperationSchema,
  reducerOutputDescriptors,
  reducerOutputFields,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerRegistry,
  SelectorOperationKind,
  SelectorOperationSchema,
} from '../../src';

describe('statistics provider schema boundaries', () => {
  it('uses the schema owner instances for every built-in definition', () => {
    const reducerRegistry = resolveStatisticsReducerRegistry();
    const selectorRegistry = resolveRowSelectorRegistry();
    const reducerSchemas = [
      [ReducerOperationKind.Count, BuiltinReducerOperationSchemas.Count],
      [ReducerOperationKind.Sum, BuiltinReducerOperationSchemas.Sum],
      [ReducerOperationKind.Mean, BuiltinReducerOperationSchemas.Mean],
      [ReducerOperationKind.Median, BuiltinReducerOperationSchemas.Median],
      [ReducerOperationKind.Min, BuiltinReducerOperationSchemas.Min],
      [ReducerOperationKind.Max, BuiltinReducerOperationSchemas.Max],
      [ReducerOperationKind.Extent, BuiltinReducerOperationSchemas.Extent],
      [ReducerOperationKind.Quantile, BuiltinReducerOperationSchemas.Quantile],
      [ReducerOperationKind.QuantileBand, BuiltinReducerOperationSchemas.QuantileBand],
    ] as const;
    const selectorSchemas = [
      [SelectorOperationKind.Min, BuiltinSelectorOperationSchemas.Min],
      [SelectorOperationKind.Max, BuiltinSelectorOperationSchemas.Max],
      [SelectorOperationKind.First, BuiltinSelectorOperationSchemas.First],
      [SelectorOperationKind.Last, BuiltinSelectorOperationSchemas.Last],
      [SelectorOperationKind.Top, BuiltinSelectorOperationSchemas.Top],
      [SelectorOperationKind.Bottom, BuiltinSelectorOperationSchemas.Bottom],
      [SelectorOperationKind.Nth, BuiltinSelectorOperationSchemas.Nth],
      [SelectorOperationKind.OutsideQuantileBand, BuiltinSelectorOperationSchemas.OutsideQuantileBand],
    ] as const;

    for (const [kind, schema] of reducerSchemas) expect(reducerRegistry.get(kind)?.schema).toBe(schema);
    for (const [kind, schema] of selectorSchemas) expect(selectorRegistry.get(kind)?.schema).toBe(schema);
  });

  it('rejects extra built-in fields consistently at schema and direct dispatch boundaries', () => {
    const reducer = { kind: ReducerOperationKind.Sum, field: 'value', as: 'total', typo: true } as const;
    const selector = { kind: SelectorOperationKind.Min, by: 'value', typo: true } as const;

    expect(ReducerOperationSchema.safeParse(reducer).success).toBe(false);
    expect(() => applyReducerOperation([{ value: 2 }], reducer, DEFAULT_TRANSFORM_CONTEXT)).toThrow();
    expect(SelectorOperationSchema.safeParse(selector).success).toBe(false);
    expect(() => applySelectorOperation([{ value: 2 }], selector, DEFAULT_TRANSFORM_CONTEXT)).toThrow();
  });

  it('exposes scalar reducer output descriptors without treating extent as scalar', () => {
    expect(reducerOutputDescriptors({ kind: 'count', as: 'rows' })).toEqual([
      { field: 'rows', type: DataFieldType.Continuous },
    ]);
    expect(reducerOutputDescriptors({ kind: 'mean', field: 'value', as: 'average' })).toEqual([
      { field: 'average', type: DataFieldType.Continuous },
    ]);
    expect(reducerOutputDescriptors({ kind: 'quantile', field: 'value', p: 0.5, as: 'median' })).toEqual([
      { field: 'median', type: DataFieldType.Continuous },
    ]);
    expect(reducerOutputDescriptors({ kind: 'extent', field: 'value', as: 'range' })).toEqual([]);
  });

  it('uses the registered reducer descriptor for custom scalar candidates', () => {
    const definition = defineStatisticsReducer({
      schema: strictObject({ kind: literal('custom-scalar'), as: string() }),
      outputFields: operation => [operation.as],
      outputs: operation => [{ field: operation.as, type: DataFieldType.Continuous }],
      reduce: (_rows, operation) => ({ [operation.as]: 1 }),
    });
    const registry = resolveStatisticsReducerRegistry([definition]);

    expect(reducerOutputDescriptors({ kind: 'custom-scalar', as: 'metric' }, registry)).toEqual([
      { field: 'metric', type: DataFieldType.Continuous },
    ]);
    expect(reducerOutputFields({ kind: 'custom-scalar', as: 'metric' }, registry)).toEqual(['metric']);
  });

  it('rejects non-JSON custom reducer input before invoking its definition', () => {
    const definition = defineStatisticsReducer({
      schema: strictObject({
        kind: literal('unsafe-input'),
        config: unknown(),
      }),
      reduce: () => ({}),
    });
    const context = {
      ...DEFAULT_TRANSFORM_CONTEXT,
      statisticsReducerRegistry: resolveStatisticsReducerRegistry([definition]),
    };
    const operation = { kind: 'unsafe-input', config: () => 1 } as const;

    expect(() => applyReducerOperation([], operation, context)).toThrow();
  });

  it('rejects non-JSON output produced by a custom definition schema', () => {
    const definition = defineStatisticsReducer({
      schema: strictObject({
        kind: literal('unsafe-output'),
        stamp: string().transform(value => new Date(value)),
      }),
      reduce: () => ({}),
    });
    const context = {
      ...DEFAULT_TRANSFORM_CONTEXT,
      statisticsReducerRegistry: resolveStatisticsReducerRegistry([definition]),
    };
    const operation = { kind: 'unsafe-output', stamp: '2026-07-11T00:00:00.000Z' } as const;

    expect(() => applyReducerOperation([], operation, context)).toThrow();
  });

  it('rejects non-JSON output produced by a custom selector schema', () => {
    const definition = defineRowSelector({
      schema: strictObject({
        kind: literal('unsafe-selector-output'),
        stamp: string().transform(value => new Date(value)),
      }),
      select: () => [],
    });
    const context = {
      ...DEFAULT_TRANSFORM_CONTEXT,
      rowSelectorRegistry: resolveRowSelectorRegistry([definition]),
    };
    const operation = { kind: 'unsafe-selector-output', stamp: '2026-07-11T00:00:00.000Z' } as const;

    expect(() => applySelectorOperation([], operation, context)).toThrow();
  });
});
