import type { ValueOf } from '@retikz/foundation';
import {
  createOpenStringSchema,
  JsonValueSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
} from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { array, discriminatedUnion, literal, looseObject, strictObject, union } from 'zod';

/** 内置统计 reducer operation kind 关键字 */
export const BuiltinReducerOperationKind = {
  /** 统计组内行数 */
  Count: 'count',
  /** 对数值字段求和 */
  Sum: 'sum',
  /** 对数值字段求算术平均值 */
  Mean: 'mean',
  /** 对数值字段求中位数 */
  Median: 'median',
  /** 对数值字段求最小值 */
  Min: 'min',
  /** 对数值字段求最大值 */
  Max: 'max',
  /** 对数值字段求最小值和最大值区间 */
  Extent: 'extent',
  /** 对数值字段求指定分位数 */
  Quantile: 'quantile',
  /** 对数值字段求分位区间 */
  QuantileBand: 'quantile-band',
} as const;

/** 统计 reducer operation 保留 kind 集合；供 external 开放配置排除内置判别串 */
const RESERVED_REDUCER_OPERATION_KINDS: ReadonlySet<string> = new Set(Object.values(BuiltinReducerOperationKind));

/** 内置统计 reducer operation kind 取值 */
export type BuiltinReducerOperationKind = ValueOf<typeof BuiltinReducerOperationKind>;

/** reducer 输出字段及其在 operation 内的 schema path */
type ReducerOutputField = {
  /** 输出字段名 */
  field: string;
  /** 字段名在 reducer operation 内的路径 */
  path: Array<string | number>;
};

/** 把 unknown 值收窄为可读取字段的普通对象 */
const recordOf = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

/** 列出 reducer operation 静态声明的输出字段及其 schema path */
export const reducerOutputFieldsOf = (operation: unknown): Array<ReducerOutputField> => {
  const record = recordOf(operation);
  if (record === undefined) return [];
  if (record.kind === BuiltinReducerOperationKind.Extent) {
    const outputs = recordOf(record.as);
    if (outputs === undefined) return [];

    const fields: Array<ReducerOutputField> = [];
    for (const key of ['min', 'max'] as const) {
      const field = outputs[key];
      if (typeof field === 'string') fields.push({ field, path: ['as', key] });
    }

    return fields;
  }

  if (record.kind !== BuiltinReducerOperationKind.QuantileBand) {
    return typeof record.as === 'string' ? [{ field: record.as, path: ['as'] }] : [];
  }

  const outputs = recordOf(record.outputs);
  if (outputs === undefined) return [];

  const fields: Array<ReducerOutputField> = [];

  for (const key of ['lower', 'upper'] as const) {
    const field = outputs[key];
    if (typeof field === 'string') fields.push({ field, path: ['outputs', key] });
  }

  if (Array.isArray(outputs.points)) {
    outputs.points.forEach((point, pointIndex) => {
      const field = recordOf(point)?.as;
      if (typeof field === 'string') fields.push({ field, path: ['outputs', 'points', pointIndex, 'as'] });
    });
  }

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
    if (typeof field === 'string') fields.push({ field, path: ['outputs', key] });
  }

  return fields;
};

/** count reducer operation schema；只输出组内行数，不读取字段 */
const CountReducerOperationSchema = strictObject({
  kind: literal(BuiltinReducerOperationKind.Count).describe('Discriminator: count reducer'),
  as: NonBlankStringSchema.describe('Output field'),
}).describe('Count reducer operation');

/** 创建一个按字段读取数值的 reducer operation schema */
const createFieldReducerOperationSchema = <TKind extends string>(kind: TKind) =>
  strictObject({
    kind: literal(kind).describe('Discriminator: numeric reducer'),
    field: NonBlankStringSchema.describe('Numeric source field'),
    as: NonBlankStringSchema.describe('Output field'),
  }).describe('Field reducer operation');

/** extent reducer 输出字段映射；最小值和最大值字段名不得相同 */
const ExtentReducerOutputsSchema = strictObject({
  min: NonBlankStringSchema.describe('Minimum output field'),
  max: NonBlankStringSchema.describe('Maximum output field'),
})
  .refine(outputs => outputs.min !== outputs.max, {
    message: 'extent output fields must be distinct',
    path: ['max'],
  })
  .describe('Extent output field mapping');

/** extent reducer operation schema；把有限数值范围输出为两个标量字段 */
const ExtentReducerOperationSchema = strictObject({
  kind: literal(BuiltinReducerOperationKind.Extent).describe('Discriminator: extent reducer'),
  field: NonBlankStringSchema.describe('Numeric source field'),
  as: ExtentReducerOutputsSchema.describe('Distinct minimum and maximum output field names'),
}).describe('Extent reducer operation');

/** quantile reducer operation schema；输出指定概率位置的单个分位点 */
const QuantileReducerOperationSchema = strictObject({
  kind: literal(BuiltinReducerOperationKind.Quantile).describe('Discriminator: quantile reducer'),
  field: NonBlankStringSchema.describe('Numeric source field'),
  p: NormalizedFractionSchema.describe('Quantile probability'),
  as: NonBlankStringSchema.describe('Output field'),
}).describe('Quantile reducer operation');

/** quantile-band reducer 额外分位点输出 schema */
export const QuantileBandPointOutputSchema = strictObject({
  p: NormalizedFractionSchema.describe('Quantile probability'),
  as: NonBlankStringSchema.describe('Output field'),
}).describe('Quantile-band point output');

/** quantile-band reducer whisker 策略 schema */
export const QuantileBandWhiskerSchema = discriminatedUnion('kind', [
  strictObject({
    kind: literal('minMax').describe('Discriminator: min/max whiskers'),
  }).describe('Min/max whisker strategy'),
  strictObject({
    kind: literal('spread').describe('Discriminator: spread fences'),
    factor: NonNegativeNumberSchema.optional().describe('Spread multiplier; default 1.5'),
  }).describe('Spread fence whisker strategy'),
]).describe('Quantile-band whisker strategy');

/** quantile-band reducer 输出字段映射 schema；所有输出字段名必须唯一 */
export const QuantileBandOutputsSchema = strictObject({
  lower: NonBlankStringSchema.describe('Lower boundary output field'),
  upper: NonBlankStringSchema.describe('Upper boundary output field'),
  points: array(QuantileBandPointOutputSchema).min(1).optional().describe('Additional quantile point outputs'),
  spread: NonBlankStringSchema.optional().describe('Spread output field'),
  lowerFence: NonBlankStringSchema.optional().describe('Lower fence output field'),
  upperFence: NonBlankStringSchema.optional().describe('Upper fence output field'),
  whiskerMin: NonBlankStringSchema.optional().describe('Lower whisker output field'),
  whiskerMax: NonBlankStringSchema.optional().describe('Upper whisker output field'),
  min: NonBlankStringSchema.optional().describe('Minimum output field'),
  max: NonBlankStringSchema.optional().describe('Maximum output field'),
  count: NonBlankStringSchema.optional().describe('Count output field'),
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

/** quantile-band reducer operation schema；用于一次计算区间、分位点、spread 与 whisker 派生字段 */
export const QuantileBandReducerOperationSchema = strictObject({
  kind: literal(BuiltinReducerOperationKind.QuantileBand).describe('Discriminator: quantile-band reducer'),
  field: NonBlankStringSchema.describe('Numeric source field'),
  lowerP: NormalizedFractionSchema.describe('Lower quantile probability'),
  upperP: NormalizedFractionSchema.describe('Upper quantile probability'),
  outputs: QuantileBandOutputsSchema.describe('Output field names'),
  whisker: QuantileBandWhiskerSchema.optional().describe('Whisker strategy'),
})
  .refine(operation => operation.lowerP < operation.upperP, {
    message: 'lowerP must be less than upperP',
    path: ['lowerP'],
  })
  .describe('Quantile-band reducer operation');

/** 内置 reducer operation 的 schema 单一真源；aggregate schema 与 provider definition 共用这些实例 */
export const BuiltinReducerOperationSchemas = Object.freeze({
  Count: CountReducerOperationSchema,
  Sum: createFieldReducerOperationSchema(BuiltinReducerOperationKind.Sum),
  Mean: createFieldReducerOperationSchema(BuiltinReducerOperationKind.Mean),
  Median: createFieldReducerOperationSchema(BuiltinReducerOperationKind.Median),
  Min: createFieldReducerOperationSchema(BuiltinReducerOperationKind.Min),
  Max: createFieldReducerOperationSchema(BuiltinReducerOperationKind.Max),
  Extent: ExtentReducerOperationSchema,
  Quantile: QuantileReducerOperationSchema,
  QuantileBand: QuantileBandReducerOperationSchema,
});

/** 外部统计 reducer operation schema；只校验 JSON 形态和非内置 kind，具体契约由运行时 definition 提供 */
const ExternalReducerOperationObjectSchema = looseObject({
  kind: createOpenStringSchema(BuiltinReducerOperationKind)
    .refine(operationKind => !RESERVED_REDUCER_OPERATION_KINDS.has(operationKind), {
      message: 'external reducer kind must not collide with a built-in reducer kind',
    })
    .describe('Discriminator: custom reducer kind'),
});

/** 校验带 JSON 配置的自定义聚合归约操作 */
const ExternalReducerOperationSchema = ExternalReducerOperationObjectSchema.catchall(JsonValueSchema).describe(
  'Custom reducer operation with JSON config',
);

/** 内置统计 reducer operation schema */
const BuiltinReducerOperationSchema = union([
  BuiltinReducerOperationSchemas.Count,
  BuiltinReducerOperationSchemas.Sum,
  BuiltinReducerOperationSchemas.Mean,
  BuiltinReducerOperationSchemas.Median,
  BuiltinReducerOperationSchemas.Min,
  BuiltinReducerOperationSchemas.Max,
  BuiltinReducerOperationSchemas.Extent,
  BuiltinReducerOperationSchemas.Quantile,
  BuiltinReducerOperationSchemas.QuantileBand,
]).describe('Built-in statistic reducer operation');

/** 统计 reducer operation schema；包含内置 kind 与外部注册 kind 开放配置对象 */
export const ReducerOperationSchema = union([BuiltinReducerOperationSchema, ExternalReducerOperationSchema]).describe(
  'Built-in or custom reducer operation',
);

/** compact aggregate可解析的单scalar reducer候选；custom项仍需Definition capability确认 */
export const DataScalarReducerOperationSchema = union([
  BuiltinReducerOperationSchemas.Count,
  BuiltinReducerOperationSchemas.Sum,
  BuiltinReducerOperationSchemas.Mean,
  BuiltinReducerOperationSchemas.Median,
  BuiltinReducerOperationSchemas.Min,
  BuiltinReducerOperationSchemas.Max,
  BuiltinReducerOperationSchemas.Quantile,
  ExternalReducerOperationSchema,
]).describe('Single-scalar reducer candidate for compact field aggregation');

/** reducer metrics schema；同一 metrics 数组内的输出字段名必须唯一 */
export const ReducerMetricsSchema = array(ReducerOperationSchema)
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

/** reducer operation（统计规约子算子） */
export type IRDataReducerOperation = ZodInfer<typeof ReducerOperationSchema>;

/** compact aggregate Source parse态候选；运行时仍需Definition确认单scalar capability */
export type IRDataScalarReducerOperation = ZodInfer<typeof DataScalarReducerOperationSchema>;

/** reducer metrics 列表 */
export type IRDataReducerMetrics = ZodInfer<typeof ReducerMetricsSchema>;

/** quantile-band reducer operation（参数化分位区间规约） */
export type IRDataQuantileBandReducerOperation = ZodInfer<typeof QuantileBandReducerOperationSchema>;
