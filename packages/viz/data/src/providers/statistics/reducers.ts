import type { AnyStatisticsReducerDefinition } from '../../contract';
import type { ExternalRow } from '../../shared';

import { defineStatisticsReducer } from '../../contract';
import { BuiltinReducerOperationSchemas } from '../../schemas';
import { finiteFieldValuesOf } from '../transform';
import {
  finiteExtentOf,
  medianOf,
  quantileBandStatsOf,
  quantileOf,
  quantileOfSorted,
  spreadFactorOf,
  valuesWithin,
} from './helpers';

/** count reducer definition：统计组内行数，不读取源字段。 */
const countReducerDefinition = defineStatisticsReducer({
  schema: BuiltinReducerOperationSchemas.Count,
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({ [operation.as]: rows.length }),
});

/** sum reducer definition：读取一个数值字段并输出有限值之和。 */
const sumReducerDefinition = defineStatisticsReducer({
  schema: BuiltinReducerOperationSchemas.Sum,
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({
    [operation.as]: finiteFieldValuesOf(rows, operation.field).reduce((sum, value) => sum + value, 0),
  }),
});

/** mean reducer definition：读取一个数值字段并输出有限值平均数。 */
const meanReducerDefinition = defineStatisticsReducer({
  schema: BuiltinReducerOperationSchemas.Mean,
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteFieldValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length };
  },
});

/** median reducer definition：读取一个数值字段并输出有限值中位数。 */
const medianReducerDefinition = defineStatisticsReducer({
  schema: BuiltinReducerOperationSchemas.Median,
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({ [operation.as]: medianOf(finiteFieldValuesOf(rows, operation.field)) }),
});

/** min reducer definition：读取一个数值字段并输出有限值最小值。 */
const minReducerDefinition = defineStatisticsReducer({
  schema: BuiltinReducerOperationSchemas.Min,
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteFieldValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? 0 : Math.min(...values) };
  },
});

/** max reducer definition：读取一个数值字段并输出有限值最大值。 */
const maxReducerDefinition = defineStatisticsReducer({
  schema: BuiltinReducerOperationSchemas.Max,
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteFieldValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? 0 : Math.max(...values) };
  },
});

/** extent reducer definition：读取一个数值字段并输出有限值 `[min, max]` 范围。 */
const extentReducerDefinition = defineStatisticsReducer({
  schema: BuiltinReducerOperationSchemas.Extent,
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteFieldValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? [0, 0] : [Math.min(...values), Math.max(...values)] };
  },
});

/** quantile reducer definition：读取一个数值字段并输出单个分位点。 */
const quantileReducerDefinition = defineStatisticsReducer({
  schema: BuiltinReducerOperationSchemas.Quantile,
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({
    [operation.as]: quantileOf(finiteFieldValuesOf(rows, operation.field), operation.p),
  }),
});

/** quantile-band reducer definition：读取一个数值字段并输出参数化分位区间及可选 whisker 字段。 */
const quantileBandReducerDefinition = defineStatisticsReducer({
  schema: BuiltinReducerOperationSchemas.QuantileBand,
  inputFields: operation => [operation.field],
  outputFields: operation => {
    const outputs: Array<string> = [
      operation.outputs.lower,
      operation.outputs.upper,
      ...(operation.outputs.points?.map(point => point.as) ?? []),
    ];
    for (const key of [
      'spread',
      'lowerFence',
      'upperFence',
      'whiskerMin',
      'whiskerMax',
      'min',
      'max',
      'count',
    ] as const) {
      const field = operation.outputs[key];
      if (field !== undefined) outputs.push(field);
    }
    return outputs;
  },
  reduce: (rows, operation) => {
    const stats = quantileBandStatsOf(rows, operation.field, operation.lowerP, operation.upperP);
    const out: ExternalRow = {
      [operation.outputs.lower]: stats.lower,
      [operation.outputs.upper]: stats.upper,
    };

    for (const point of operation.outputs.points ?? []) out[point.as] = quantileOfSorted(stats.sortedValues, point.p);
    if (operation.outputs.spread !== undefined) out[operation.outputs.spread] = stats.spread;
    if (operation.outputs.min !== undefined) out[operation.outputs.min] = stats.min;
    if (operation.outputs.max !== undefined) out[operation.outputs.max] = stats.max;
    if (operation.outputs.count !== undefined) out[operation.outputs.count] = stats.count;

    if (operation.whisker?.kind === 'minMax') {
      if (operation.outputs.whiskerMin !== undefined) out[operation.outputs.whiskerMin] = stats.min;
      if (operation.outputs.whiskerMax !== undefined) out[operation.outputs.whiskerMax] = stats.max;
    }
    if (operation.whisker?.kind === 'spread') {
      const factor = spreadFactorOf(operation.whisker.factor);
      const lowerFence = stats.lower - factor * stats.spread;
      const upperFence = stats.upper + factor * stats.spread;
      const insideFence = valuesWithin(stats.sortedValues, lowerFence, upperFence);
      const whiskerExtent = finiteExtentOf(insideFence);
      if (operation.outputs.lowerFence !== undefined) out[operation.outputs.lowerFence] = lowerFence;
      if (operation.outputs.upperFence !== undefined) out[operation.outputs.upperFence] = upperFence;
      if (operation.outputs.whiskerMin !== undefined) out[operation.outputs.whiskerMin] = whiskerExtent.min;
      if (operation.outputs.whiskerMax !== undefined) out[operation.outputs.whiskerMax] = whiskerExtent.max;
    }

    return out;
  },
});

/** 内置统计 reducer 定义集合；内置与自定义 reducer 共享同一 registry 分派流程。 */
export const BUILTIN_STATISTICS_REDUCERS: ReadonlyArray<AnyStatisticsReducerDefinition> = [
  countReducerDefinition,
  sumReducerDefinition,
  meanReducerDefinition,
  medianReducerDefinition,
  minReducerDefinition,
  maxReducerDefinition,
  extentReducerDefinition,
  quantileReducerDefinition,
  quantileBandReducerDefinition,
] as ReadonlyArray<AnyStatisticsReducerDefinition>;
