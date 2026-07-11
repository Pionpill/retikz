import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

import { ReducerOperationKind, RESERVED_REDUCER_OPERATION_KINDS } from './constants';

/** count reducer operation schema；只输出组内行数，不读取字段。 */
const CountReducerOperationSchema = z
  .strictObject({
    kind: z.literal(ReducerOperationKind.Count).describe('Discriminator: count reducer'),
    as: z.string().min(1).describe('Output field'),
  })
  .describe('Count reducer operation');

/** 创建一个按字段读取数值的 reducer operation schema。 */
const createFieldReducerOperationSchema = <TKind extends string>(kind: TKind) =>
  z
    .strictObject({
      kind: z.literal(kind).describe('Discriminator: numeric reducer'),
      field: z.string().min(1).describe('Numeric source field'),
      as: z.string().min(1).describe('Output field'),
    })
    .describe('Field reducer operation');

/** quantile reducer operation schema；输出指定概率位置的单个分位点。 */
const QuantileReducerOperationSchema = z
  .strictObject({
    kind: z.literal(ReducerOperationKind.Quantile).describe('Discriminator: quantile reducer'),
    field: z.string().min(1).describe('Numeric source field'),
    p: z.number().min(0).max(1).describe('Quantile probability'),
    as: z.string().min(1).describe('Output field'),
  })
  .describe('Quantile reducer operation');

/** quantile-band reducer 额外分位点输出 schema。 */
export const QuantileBandPointOutputSchema = z
  .strictObject({
    p: z.number().min(0).max(1).describe('Quantile probability'),
    as: z.string().min(1).describe('Output field'),
  })
  .describe('Quantile-band point output');

/** quantile-band reducer whisker 策略 schema。 */
export const QuantileBandWhiskerSpecSchema = z
  .discriminatedUnion('kind', [
    z
      .strictObject({
        kind: z.literal('minMax').describe('Discriminator: min/max whiskers'),
      })
      .describe('Min/max whisker strategy'),
    z
      .strictObject({
        kind: z.literal('spread').describe('Discriminator: spread fences'),
        factor: z.number().nonnegative().optional().describe('Spread multiplier; default 1.5'),
      })
      .describe('Spread fence whisker strategy'),
  ])
  .describe('Quantile-band whisker strategy');

/** quantile-band reducer 输出字段映射 schema；所有输出字段名必须唯一。 */
export const QuantileBandOutputsSchema = z
  .strictObject({
    lower: z.string().min(1).describe('Lower boundary output field'),
    upper: z.string().min(1).describe('Upper boundary output field'),
    points: z.array(QuantileBandPointOutputSchema).min(1).optional().describe('Additional quantile point outputs'),
    spread: z.string().min(1).optional().describe('Spread output field'),
    lowerFence: z.string().min(1).optional().describe('Lower fence output field'),
    upperFence: z.string().min(1).optional().describe('Upper fence output field'),
    whiskerMin: z.string().min(1).optional().describe('Lower whisker output field'),
    whiskerMax: z.string().min(1).optional().describe('Upper whisker output field'),
    min: z.string().min(1).optional().describe('Minimum output field'),
    max: z.string().min(1).optional().describe('Maximum output field'),
    count: z.string().min(1).optional().describe('Count output field'),
  })
  .superRefine((outputs, ctx) => {
    const seen = new Map<string, Array<string | number>>();
    const addField = (field: string, path: Array<string | number>): void => {
      const previous = seen.get(field);
      if (previous !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `duplicate quantile-band output field "${field}"`,
        });
      }
      seen.set(field, path);
    };
    addField(outputs.lower, ['lower']);
    addField(outputs.upper, ['upper']);
    outputs.points?.forEach((point, index) => addField(point.as, ['points', index, 'as']));
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
      const field = outputs[key];
      if (field !== undefined) addField(field, [key]);
    }
  })
  .describe('Quantile-band output field mapping');

/** quantile-band reducer operation schema；用于一次计算区间、分位点、spread 与 whisker 派生字段。 */
export const QuantileBandReducerOperationSchema = z
  .strictObject({
    kind: z.literal(ReducerOperationKind.QuantileBand).describe('Discriminator: quantile-band reducer'),
    field: z.string().min(1).describe('Numeric source field'),
    lowerP: z.number().min(0).max(1).describe('Lower quantile probability'),
    upperP: z.number().min(0).max(1).describe('Upper quantile probability'),
    outputs: QuantileBandOutputsSchema.describe('Output field names'),
    whisker: QuantileBandWhiskerSpecSchema.optional().describe('Whisker strategy'),
  })
  .refine(operation => operation.lowerP < operation.upperP, {
    message: 'lowerP must be less than upperP',
    path: ['lowerP'],
  })
  .describe('Quantile-band reducer operation');

/** 内置 reducer operation 的 schema 单一真源；aggregate schema 与 provider definition 共用这些实例。 */
export const BuiltinReducerOperationSchemas = Object.freeze({
  Count: CountReducerOperationSchema,
  Sum: createFieldReducerOperationSchema(ReducerOperationKind.Sum),
  Mean: createFieldReducerOperationSchema(ReducerOperationKind.Mean),
  Median: createFieldReducerOperationSchema(ReducerOperationKind.Median),
  Min: createFieldReducerOperationSchema(ReducerOperationKind.Min),
  Max: createFieldReducerOperationSchema(ReducerOperationKind.Max),
  Extent: createFieldReducerOperationSchema(ReducerOperationKind.Extent),
  Quantile: QuantileReducerOperationSchema,
  QuantileBand: QuantileBandReducerOperationSchema,
});

/** 外部统计 reducer operation schema；只校验 JSON 形态和非内置 kind，具体契约由运行时 definition 提供。 */
const ExternalReducerOperationSchema = z
  .looseObject({
    kind: z
      .string()
      .min(1)
      .refine(operationKind => !RESERVED_REDUCER_OPERATION_KINDS.has(operationKind), {
        message: 'external reducer kind must not collide with a built-in reducer kind',
      })
      .describe('Discriminator: custom reducer kind'),
  })
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        message:
          'external reducer operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe('Custom reducer operation with JSON config');

/** 内置统计 reducer operation schema。 */
export const BuiltinReducerOperationSchema = z
  .union([
    BuiltinReducerOperationSchemas.Count,
    BuiltinReducerOperationSchemas.Sum,
    BuiltinReducerOperationSchemas.Mean,
    BuiltinReducerOperationSchemas.Median,
    BuiltinReducerOperationSchemas.Min,
    BuiltinReducerOperationSchemas.Max,
    BuiltinReducerOperationSchemas.Extent,
    BuiltinReducerOperationSchemas.Quantile,
    BuiltinReducerOperationSchemas.QuantileBand,
  ])
  .describe('Built-in statistic reducer operation');

/** 统计 reducer operation schema；包含内置 kind 与外部注册 kind 开放配置对象。 */
export const ReducerOperationSchema = z
  .union([BuiltinReducerOperationSchema, ExternalReducerOperationSchema])
  .describe('Built-in or custom reducer operation');

/** 列出 reducer operation 产出的字段名及其 schema path，用于重复输出字段诊断。 */
const reducerOutputFieldsOf = (
  operation: z.infer<typeof ReducerOperationSchema>,
): Array<{ field: string; path: Array<string | number> }> => {
  if (operation.kind === ReducerOperationKind.QuantileBand) {
    const quantileBandOperation = QuantileBandReducerOperationSchema.parse(operation);
    const fields: Array<{ field: string; path: Array<string | number> }> = [
      { field: quantileBandOperation.outputs.lower, path: ['outputs', 'lower'] },
      { field: quantileBandOperation.outputs.upper, path: ['outputs', 'upper'] },
    ];
    quantileBandOperation.outputs.points?.forEach((point, pointIndex) =>
      fields.push({ field: point.as, path: ['outputs', 'points', pointIndex, 'as'] }),
    );
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
      const field = quantileBandOperation.outputs[key];
      if (field !== undefined) fields.push({ field, path: ['outputs', key] });
    }
    return fields;
  }
  if ('as' in operation && typeof operation.as === 'string') return [{ field: operation.as, path: ['as'] }];
  return [];
};

/** reducer metrics schema；同一 metrics 数组内的输出字段名必须唯一。 */
export const ReducerMetricsSchema = z
  .array(ReducerOperationSchema)
  .min(1)
  .superRefine((metrics, ctx) => {
    const seen = new Set<string>();
    for (let index = 0; index < metrics.length; index++) {
      for (const { field, path } of reducerOutputFieldsOf(metrics[index])) {
        if (seen.has(field)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, ...path],
            message: `duplicate reducer output field "${field}"`,
          });
        }
        seen.add(field);
      }
    }
  })
  .describe('Reducer metrics with unique output fields');
