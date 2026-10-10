import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import {
  defineStatisticsReducerImplementation,
  defineRowSelectorImplementation,
  resolveRowSelectorImplementationRegistry,
  DataFieldType,
  DEFAULT_TRANSFORM_CONTEXT,
  defineRowSelector,
  defineStatisticsReducer,
  BuiltinReducerOperationKind,
  ReducerOperationSchema,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerImplementationRegistry,
  resolveStatisticsReducerRegistry,
  BuiltinSelectorOperationKind,
  SelectorOperationSchema,
} from '../../src';
import {
  applyReducerOperation,
  applySelectorOperation,
  reducerOutputDescriptors,
  reducerOutputFields,
} from '../../src/providers/statistics';
import { BuiltinReducerOperationSchemas, BuiltinSelectorOperationSchemas } from '../../src/schemas/transform';

describe('statistics provider schema boundaries', () => {
  it('uses the schema owner instances for every built-in definition', () => {
    const reducerRegistry = resolveStatisticsReducerRegistry();
    const selectorRegistry = resolveRowSelectorRegistry();
    const reducerSchemas = [
      [BuiltinReducerOperationKind.Count, BuiltinReducerOperationSchemas.Count],
      [BuiltinReducerOperationKind.Sum, BuiltinReducerOperationSchemas.Sum],
      [BuiltinReducerOperationKind.Mean, BuiltinReducerOperationSchemas.Mean],
      [BuiltinReducerOperationKind.Median, BuiltinReducerOperationSchemas.Median],
      [BuiltinReducerOperationKind.Min, BuiltinReducerOperationSchemas.Min],
      [BuiltinReducerOperationKind.Max, BuiltinReducerOperationSchemas.Max],
      [BuiltinReducerOperationKind.Extent, BuiltinReducerOperationSchemas.Extent],
      [BuiltinReducerOperationKind.Quantile, BuiltinReducerOperationSchemas.Quantile],
      [BuiltinReducerOperationKind.QuantileBand, BuiltinReducerOperationSchemas.QuantileBand],
    ] as const;
    const selectorSchemas = [
      [BuiltinSelectorOperationKind.Min, BuiltinSelectorOperationSchemas.Min],
      [BuiltinSelectorOperationKind.Max, BuiltinSelectorOperationSchemas.Max],
      [BuiltinSelectorOperationKind.First, BuiltinSelectorOperationSchemas.First],
      [BuiltinSelectorOperationKind.Last, BuiltinSelectorOperationSchemas.Last],
      [BuiltinSelectorOperationKind.Top, BuiltinSelectorOperationSchemas.Top],
      [BuiltinSelectorOperationKind.Bottom, BuiltinSelectorOperationSchemas.Bottom],
      [BuiltinSelectorOperationKind.Nth, BuiltinSelectorOperationSchemas.Nth],
      [BuiltinSelectorOperationKind.OutsideQuantileBand, BuiltinSelectorOperationSchemas.OutsideQuantileBand],
    ] as const;

    for (const [kind, schema] of reducerSchemas) expect(reducerRegistry.get(kind)?.schema).toBe(schema);

    for (const [kind, schema] of selectorSchemas) expect(selectorRegistry.get(kind)?.schema).toBe(schema);
  });

  it('rejects extra built-in fields consistently at schema and direct dispatch boundaries', () => {
    const reducer = { kind: BuiltinReducerOperationKind.Sum, field: 'value', as: 'total', typo: true } as const;
    const selector = { kind: BuiltinSelectorOperationKind.Min, by: 'value', typo: true } as const;

    expect(ReducerOperationSchema.safeParse(reducer).success).toBe(false);
    expect(() => applyReducerOperation([{ value: 2 }], reducer, DEFAULT_TRANSFORM_CONTEXT)).toThrow();
    expect(SelectorOperationSchema.safeParse(selector).success).toBe(false);
    expect(() => applySelectorOperation([{ value: 2 }], selector, DEFAULT_TRANSFORM_CONTEXT)).toThrow();
  });

  it('exposes continuous output descriptors for scalar reducers and both extent endpoints', () => {
    expect(reducerOutputDescriptors({ kind: 'count', as: 'rows' })).toEqual([
      { field: 'rows', type: DataFieldType.Continuous },
    ]);
    expect(reducerOutputDescriptors({ kind: 'mean', field: 'value', as: 'average' })).toEqual([
      { field: 'average', type: DataFieldType.Continuous },
    ]);
    expect(reducerOutputDescriptors({ kind: 'quantile', field: 'value', p: 0.5, as: 'median' })).toEqual([
      { field: 'median', type: DataFieldType.Continuous },
    ]);
    expect(reducerOutputDescriptors({ kind: 'extent', field: 'value', as: { min: 'low', max: 'high' } })).toEqual([
      { field: 'low', type: DataFieldType.Continuous },
      { field: 'high', type: DataFieldType.Continuous },
    ]);
    expect(reducerOutputFields({ kind: 'extent', field: 'value', as: { min: 'low', max: 'high' } })).toEqual([
      'low',
      'high',
    ]);
  });

  it('uses the registered reducer descriptor for custom scalar candidates', () => {
    const definition = defineStatisticsReducer({
      schema: strictObject({ kind: literal('custom-scalar'), as: string() }),
      outputs: operation => [{ field: operation.as, type: DataFieldType.Continuous }],
    });
    const registry = resolveStatisticsReducerRegistry([definition]);

    expect(reducerOutputDescriptors({ kind: 'custom-scalar', as: 'metric' }, registry)).toEqual([
      { field: 'metric', type: DataFieldType.Continuous },
    ]);
    expect(reducerOutputFields({ kind: 'custom-scalar', as: 'metric' }, registry)).toEqual(['metric']);
  });

  it('passes a custom reducer schema transform output directly to its definition', () => {
    let observed: unknown;
    const definition = defineStatisticsReducer({
      schema: strictObject({
        kind: literal('unsafe-output'),
        stamp: string().transform(value => new Date(value)),
      }),
      outputs: () => [],
    });
    const definitionImplementation = defineStatisticsReducerImplementation({
      definition,
      reduce: (_rows, operation) => {
        observed = operation.stamp;
        return {};
      },
    });
    const context = {
      ...DEFAULT_TRANSFORM_CONTEXT,
      statisticsReducerRegistry: resolveStatisticsReducerRegistry([definition]),
      statisticsReducerImplementationRegistry: resolveStatisticsReducerImplementationRegistry(
        resolveStatisticsReducerRegistry([definition]),
        [definitionImplementation],
      ),
    };
    const operation = { kind: 'unsafe-output', stamp: '2026-07-11T00:00:00.000Z' } as const;

    expect(applyReducerOperation([], operation, context)).toEqual({});
    expect(observed).toEqual(new Date('2026-07-11T00:00:00.000Z'));
  });

  it('passes a custom selector schema transform output directly to its definition', () => {
    let observed: unknown;
    const definition = defineRowSelector({
      schema: strictObject({
        kind: literal('unsafe-selector-output'),
        stamp: string().transform(value => new Date(value)),
      }),
    });
    const definitionImplementation = defineRowSelectorImplementation({
      definition,
      select: (_rows, operation) => {
        observed = operation.stamp;
        return [];
      },
    });
    const context = {
      ...DEFAULT_TRANSFORM_CONTEXT,
      rowSelectorRegistry: resolveRowSelectorRegistry([definition]),
      rowSelectorImplementationRegistry: resolveRowSelectorImplementationRegistry(
        resolveRowSelectorRegistry([definition]),
        [definitionImplementation],
      ),
    };
    const operation = { kind: 'unsafe-selector-output', stamp: '2026-07-11T00:00:00.000Z' } as const;

    expect(applySelectorOperation([], operation, context)).toEqual([]);
    expect(observed).toEqual(new Date('2026-07-11T00:00:00.000Z'));
  });
});
