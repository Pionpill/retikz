import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import {
  BuiltinReducerOperationKind,
  BuiltinSelectorOperationKind,
  DataFieldType,
  DEFAULT_TRANSFORM_CONTEXT,
  defineRowSelector,
  defineRowSelectorImplementation,
  defineStatisticsReducer,
  defineStatisticsReducerImplementation,
  ReducerOperationSchema,
  resolveRowSelectorImplementationRegistry,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerImplementationRegistry,
  resolveStatisticsReducerRegistry,
  SelectorOperationSchema,
} from '../../src';
import {
  BUILTIN_REDUCER_OPERATION_SCHEMAS,
  reducerOutputDescriptors,
  reducerOutputFields,
  resolveReducerComputation,
} from '../../src/operators/reducer';
import { BUILTIN_SELECTOR_OPERATION_SCHEMAS, resolveSelectorComputation } from '../../src/operators/selector';

describe('统计提供者 schema 边界', () => {
  it('对每个内置定义使用 schema 所属模块实例', () => {
    const reducerRegistry = resolveStatisticsReducerRegistry();
    const selectorRegistry = resolveRowSelectorRegistry();
    const reducerSchemas = [
      [BuiltinReducerOperationKind.Count, BUILTIN_REDUCER_OPERATION_SCHEMAS.Count],
      [BuiltinReducerOperationKind.Sum, BUILTIN_REDUCER_OPERATION_SCHEMAS.Sum],
      [BuiltinReducerOperationKind.Mean, BUILTIN_REDUCER_OPERATION_SCHEMAS.Mean],
      [BuiltinReducerOperationKind.Median, BUILTIN_REDUCER_OPERATION_SCHEMAS.Median],
      [BuiltinReducerOperationKind.Min, BUILTIN_REDUCER_OPERATION_SCHEMAS.Min],
      [BuiltinReducerOperationKind.Max, BUILTIN_REDUCER_OPERATION_SCHEMAS.Max],
      [BuiltinReducerOperationKind.Extent, BUILTIN_REDUCER_OPERATION_SCHEMAS.Extent],
      [BuiltinReducerOperationKind.Quantile, BUILTIN_REDUCER_OPERATION_SCHEMAS.Quantile],
      [BuiltinReducerOperationKind.QuantileBand, BUILTIN_REDUCER_OPERATION_SCHEMAS.QuantileBand],
    ] as const;
    const selectorSchemas = [
      [BuiltinSelectorOperationKind.Min, BUILTIN_SELECTOR_OPERATION_SCHEMAS.Min],
      [BuiltinSelectorOperationKind.Max, BUILTIN_SELECTOR_OPERATION_SCHEMAS.Max],
      [BuiltinSelectorOperationKind.First, BUILTIN_SELECTOR_OPERATION_SCHEMAS.First],
      [BuiltinSelectorOperationKind.Last, BUILTIN_SELECTOR_OPERATION_SCHEMAS.Last],
      [BuiltinSelectorOperationKind.Top, BUILTIN_SELECTOR_OPERATION_SCHEMAS.Top],
      [BuiltinSelectorOperationKind.Bottom, BUILTIN_SELECTOR_OPERATION_SCHEMAS.Bottom],
      [BuiltinSelectorOperationKind.Nth, BUILTIN_SELECTOR_OPERATION_SCHEMAS.Nth],
      [BuiltinSelectorOperationKind.OutsideQuantileBand, BUILTIN_SELECTOR_OPERATION_SCHEMAS.OutsideQuantileBand],
    ] as const;

    for (const [kind, schema] of reducerSchemas) expect(reducerRegistry.get(kind)?.schema).toBe(schema);

    for (const [kind, schema] of selectorSchemas) expect(selectorRegistry.get(kind)?.schema).toBe(schema);
  });

  it('在 schema 和直接调度边界处一致拒绝额外的内置字段', () => {
    const reducer = { kind: BuiltinReducerOperationKind.Sum, field: 'value', as: 'total', typo: true } as const;
    const selector = { kind: BuiltinSelectorOperationKind.Min, by: 'value', typo: true } as const;

    expect(ReducerOperationSchema.safeParse(reducer).success).toBe(false);
    expect(() => resolveReducerComputation(reducer, DEFAULT_TRANSFORM_CONTEXT)([{ value: 2 }])).toThrow();
    expect(SelectorOperationSchema.safeParse(selector).success).toBe(false);
    expect(() => resolveSelectorComputation(selector, DEFAULT_TRANSFORM_CONTEXT)([{ value: 2 }])).toThrow();
  });

  it('公开标量缩减器和两个扩展端点的连续输出描述符', () => {
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

  it('将注册的归约器描述符用于自定义标量候选', () => {
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

  it('将自定义归约器 schema 转换输出直接传递到其定义', () => {
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

    expect(resolveReducerComputation(operation, context)([])).toEqual({});
    expect(observed).toEqual(new Date('2026-07-11T00:00:00.000Z'));
  });

  it('将自定义选择器 schema 转换输出直接传递到其定义', () => {
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

    expect(resolveSelectorComputation(operation, context)([])).toEqual([]);
    expect(observed).toEqual(new Date('2026-07-11T00:00:00.000Z'));
  });
});
