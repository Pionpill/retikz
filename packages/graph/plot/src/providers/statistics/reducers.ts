import { z } from 'zod';

import type { AnyStatisticsReducerDefinition } from '../../contract';
import type { ExternalRow } from '../../schemas';

import { defineStatisticsReducer } from '../../contract';
import { QuantileBandReducerOperationSchema } from '../../schemas';
import {
  finiteExtentOf,
  finiteValuesOf,
  medianOf,
  quantileBandStatsOf,
  quantileOf,
  quantileOfSorted,
  spreadFactorOf,
  valuesWithin,
} from './helpers';

/** `count` reducer：统计组内行数。 */
const countReducerDefinition = defineStatisticsReducer({
  schema: z.object({
    op: z.literal('count'),
    as: z.string().min(1),
  }),
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({ [operation.as]: rows.length }),
});

/** `sum` reducer：对有限数值求和。 */
const sumReducerDefinition = defineStatisticsReducer({
  schema: z.object({
    op: z.literal('sum'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({
    [operation.as]: finiteValuesOf(rows, operation.field).reduce((sum, value) => sum + value, 0),
  }),
});

/** `mean` reducer：对有限数值求平均。 */
const meanReducerDefinition = defineStatisticsReducer({
  schema: z.object({
    op: z.literal('mean'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length };
  },
});

/** `median` reducer：计算有限数值中位数。 */
const medianReducerDefinition = defineStatisticsReducer({
  schema: z.object({
    op: z.literal('median'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({ [operation.as]: medianOf(finiteValuesOf(rows, operation.field)) }),
});

/** `min` reducer：计算有限数值最小值。 */
const minReducerDefinition = defineStatisticsReducer({
  schema: z.object({
    op: z.literal('min'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? 0 : Math.min(...values) };
  },
});

/** `max` reducer：计算有限数值最大值。 */
const maxReducerDefinition = defineStatisticsReducer({
  schema: z.object({
    op: z.literal('max'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? 0 : Math.max(...values) };
  },
});

/** `extent` reducer：输出有限数值的 `[min, max]` 范围。 */
const extentReducerDefinition = defineStatisticsReducer({
  schema: z.object({
    op: z.literal('extent'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? [0, 0] : [Math.min(...values), Math.max(...values)] };
  },
});

/** `quantile` reducer：输出单个分位点。 */
const quantileReducerDefinition = defineStatisticsReducer({
  schema: z.object({
    op: z.literal('quantile'),
    field: z.string().min(1),
    p: z.number().min(0).max(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({ [operation.as]: quantileOf(finiteValuesOf(rows, operation.field), operation.p) }),
});

/** `quantile-band` reducer：输出参数化分位区间及可选 whisker 字段。 */
const quantileBandReducerDefinition = defineStatisticsReducer({
  schema: QuantileBandReducerOperationSchema,
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

/** 内置统计 reducer 定义集合。 */
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
