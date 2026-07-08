import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

import {
  DataSortOrder,
  DataTransform,
  FieldReducerOperationKind,
  FirstLastSelectorOperationKind,
  MinMaxSelectorOperationKind,
  ReducerOperationKind,
  RESERVED_REDUCER_OPERATION_KINDS,
  RESERVED_SELECTOR_OPERATION_KINDS,
  RESERVED_TRANSFORM_KINDS,
  RowSelectorTie,
  SelectorOperationKind,
  TopBottomSelectorOperationKind,
} from './constants';

/** sort transform schema；稳定地按单个字段重排行，并保持相等键的原始顺序。 */
export const SortTransformSchema = z
  .strictObject({
    kind: z.literal(DataTransform.Sort).describe('Discriminator: sort rows'),
    field: z.string().min(1).describe('Sort field'),
    order: z.enum(DataSortOrder).optional().describe('Sort direction; default ascending'),
  })
  .describe('Sort rows by one field');

/** transform 分组键 schema；缺省或空数组表示全局单组。 */
export const GroupBySchema = z
  .array(z.string().min(1))
  .optional()
  .describe('Group key fields; omitted or empty means one group');

/** row selector 排序规则 schema；用于 first / last / nth 等代表行选择。 */
export const OrderBySchema = z
  .object({
    field: z.string().min(1).describe('Order field'),
    order: z.enum(DataSortOrder).optional().describe('Sort direction; default ascending'),
  })
  .strict()
  .describe('Row ordering rule');

/** count reducer operation schema；只输出组内行数，不读取字段。 */
const CountReducerOperationSchema = z
  .object({
    kind: z.literal(ReducerOperationKind.Count).describe('Discriminator: count reducer'),
    as: z.string().min(1).describe('Output field'),
  })
  .strict()
  .describe('Count reducer operation');

/** 字段统计 reducer operation schema；覆盖 sum / mean / median / min / max / extent。 */
const FieldReducerOperationSchema = z
  .object({
    kind: z.enum(FieldReducerOperationKind).describe('Discriminator: numeric reducer'),
    field: z.string().min(1).describe('Numeric source field'),
    as: z.string().min(1).describe('Output field'),
  })
  .strict()
  .describe('Field reducer operation');

/** quantile reducer operation schema；输出指定概率位置的单个分位点。 */
const QuantileReducerOperationSchema = z
  .object({
    kind: z.literal(ReducerOperationKind.Quantile).describe('Discriminator: quantile reducer'),
    field: z.string().min(1).describe('Numeric source field'),
    p: z.number().min(0).max(1).describe('Quantile probability'),
    as: z.string().min(1).describe('Output field'),
  })
  .strict()
  .describe('Quantile reducer operation');

/** quantile-band reducer 额外分位点输出 schema。 */
export const QuantileBandPointOutputSchema = z
  .object({
    p: z.number().min(0).max(1).describe('Quantile probability'),
    as: z.string().min(1).describe('Output field'),
  })
  .strict()
  .describe('Quantile-band point output');

/** quantile-band reducer whisker 策略 schema。 */
export const QuantileBandWhiskerSpecSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('minMax').describe('Discriminator: min/max whiskers'),
      })
      .strict()
      .describe('Min/max whisker strategy'),
    z
      .object({
        kind: z.literal('spread').describe('Discriminator: spread fences'),
        factor: z.number().nonnegative().optional().describe('Spread multiplier; default 1.5'),
      })
      .strict()
      .describe('Spread fence whisker strategy'),
  ])
  .describe('Quantile-band whisker strategy');

/** quantile-band reducer 输出字段映射 schema；所有输出字段名必须唯一。 */
export const QuantileBandOutputsSchema = z
  .object({
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
  .strict()
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
  .object({
    kind: z.literal(ReducerOperationKind.QuantileBand).describe('Discriminator: quantile-band reducer'),
    field: z.string().min(1).describe('Numeric source field'),
    lowerP: z.number().min(0).max(1).describe('Lower quantile probability'),
    upperP: z.number().min(0).max(1).describe('Upper quantile probability'),
    outputs: QuantileBandOutputsSchema.describe('Output field names'),
    whisker: QuantileBandWhiskerSpecSchema.optional().describe('Whisker strategy'),
  })
  .strict()
  .refine(operation => operation.lowerP < operation.upperP, {
    message: 'lowerP must be less than upperP',
    path: ['lowerP'],
  })
  .describe('Quantile-band reducer operation');

/** 外部统计 reducer operation schema；只校验 JSON 形态和非内置 kind，具体契约由运行时 definition 提供。 */
const ExternalReducerOperationSchema = z
  .object({
    kind: z
      .string()
      .min(1)
      .refine(operationKind => !RESERVED_REDUCER_OPERATION_KINDS.has(operationKind), {
        message: 'external reducer kind must not collide with a built-in reducer kind',
      })
      .describe('Discriminator: custom reducer kind'),
  })
  .passthrough()
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
    CountReducerOperationSchema,
    FieldReducerOperationSchema,
    QuantileReducerOperationSchema,
    QuantileBandReducerOperationSchema,
  ])
  .describe('Built-in statistic reducer operation');

/** 统计 reducer operation schema；包含内置 kind 与外部注册 kind passthrough。 */
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

/** min / max selector operation schema；按数值字段选极值行。 */
const MinMaxSelectorOperationSchema = z
  .object({
    kind: z.enum(MinMaxSelectorOperationKind).describe('Discriminator: min/max row selector'),
    by: z.string().min(1).describe('Numeric ranking field'),
    tie: z.enum(RowSelectorTie).optional().describe('Tie-breaking strategy; default first'),
  })
  .strict()
  .describe('Min/max row selector operation');

/** first / last selector operation schema；按输入顺序或显式 orderBy 取首尾行。 */
const FirstLastSelectorOperationSchema = z
  .object({
    kind: z.enum(FirstLastSelectorOperationKind).describe('Discriminator: first/last row selector'),
    orderBy: z
      .array(OrderBySchema)
      .min(1)
      .optional()
      .describe('Ordering before selection; omitted keeps current order'),
  })
  .strict()
  .describe('First/last row selector operation');

/** top / bottom selector operation schema；按数值字段排名并选择 N 行。 */
const TopBottomSelectorOperationSchema = z
  .object({
    kind: z.enum(TopBottomSelectorOperationKind).describe('Discriminator: top/bottom row selector'),
    by: z.string().min(1).describe('Numeric ranking field'),
    n: z.number().int().positive().describe('Selected row count'),
    tie: z.enum(RowSelectorTie).optional().describe('Tie-breaking strategy; default first'),
  })
  .strict()
  .describe('Top/bottom row selector operation');

/** nth selector operation schema；按显式 orderBy 选择零基下标行。 */
const NthSelectorOperationSchema = z
  .object({
    kind: z.literal(SelectorOperationKind.Nth).describe('Discriminator: nth row selector'),
    orderBy: z.array(OrderBySchema).min(1).describe('Ordering before selection'),
    index: z.number().int().nonnegative().describe('Zero-based row index'),
  })
  .strict()
  .describe('Nth row selector operation');

/** outside-quantile-band selector 边界策略 schema。 */
export const OutsideQuantileBandBoundarySpecSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('band').describe('Discriminator: quantile band boundaries'),
      })
      .strict()
      .describe('Quantile band boundary strategy'),
    z
      .object({
        kind: z.literal('spread').describe('Discriminator: spread fences'),
        factor: z.number().nonnegative().optional().describe('Spread multiplier; default 1.5'),
      })
      .strict()
      .describe('Spread fence boundary strategy'),
  ])
  .describe('Outside quantile-band boundary strategy');

/** outside-quantile-band selector operation schema；选择分位区间或 spread fence 外的原始行。 */
export const OutsideQuantileBandSelectorOperationSchema = z
  .object({
    kind: z.literal(SelectorOperationKind.OutsideQuantileBand).describe('Discriminator: outside-band selector'),
    field: z.string().min(1).describe('Numeric source field'),
    lowerP: z.number().min(0).max(1).describe('Lower quantile probability'),
    upperP: z.number().min(0).max(1).describe('Upper quantile probability'),
    boundary: OutsideQuantileBandBoundarySpecSchema.optional().describe('Boundary strategy; default band'),
  })
  .strict()
  .refine(operation => operation.lowerP < operation.upperP, {
    message: 'lowerP must be less than upperP',
    path: ['lowerP'],
  })
  .describe('Outside quantile-band row selector operation');

/** 外部 row selector operation schema；只校验 JSON 形态和非内置 kind，具体契约由运行时 definition 提供。 */
const ExternalSelectorOperationSchema = z
  .object({
    kind: z
      .string()
      .min(1)
      .refine(operationKind => !RESERVED_SELECTOR_OPERATION_KINDS.has(operationKind), {
        message: 'external selector kind must not collide with a built-in selector kind',
      })
      .describe('Discriminator: custom selector kind'),
  })
  .passthrough()
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        message:
          'external selector operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe('Custom selector operation with JSON config');

/** 内置 row selector operation schema。 */
export const BuiltinSelectorOperationSchema = z
  .union([
    MinMaxSelectorOperationSchema,
    FirstLastSelectorOperationSchema,
    TopBottomSelectorOperationSchema,
    NthSelectorOperationSchema,
    OutsideQuantileBandSelectorOperationSchema,
  ])
  .describe('Built-in row selector operation');

/** row selector operation schema；包含内置 kind 与外部注册 kind passthrough。 */
export const SelectorOperationSchema = z
  .union([BuiltinSelectorOperationSchema, ExternalSelectorOperationSchema])
  .describe('Built-in or custom row selector operation');

/** summarize transform schema；按 groupBy 分组并输出 reducer metrics 行。 */
export const SummarizeTransformSchema = z
  .object({
    kind: z.literal(DataTransform.Summarize).describe('Discriminator: summarize transform'),
    groupBy: GroupBySchema,
    metrics: ReducerMetricsSchema.describe('Reducer metrics'),
  })
  .strict()
  .describe('Group rows into metric rows');

/** select transform schema；按 groupBy 分组后输出 selector 选中的原始行。 */
export const SelectTransformSchema = z
  .object({
    kind: z.literal(DataTransform.Select).describe('Discriminator: select transform'),
    groupBy: GroupBySchema,
    selector: SelectorOperationSchema.describe('Row selector'),
    rankAs: z.string().min(1).optional().describe('One-based rank output field'),
  })
  .strict()
  .describe('Select representative rows per group');

/** annotate transform selector 回填配置 schema。 */
export const AnnotateSelectorSchema = z
  .object({
    selector: SelectorOperationSchema.describe('Row selector'),
    as: z.string().min(1).describe('Annotation output field'),
  })
  .strict()
  .describe('Selector annotation');

/** annotate transform schema；保留输入行并追加 reducer / selector 派生字段。 */
export const AnnotateTransformSchema = z
  .object({
    kind: z.literal(DataTransform.Annotate).describe('Discriminator: annotate transform'),
    groupBy: GroupBySchema,
    metrics: ReducerMetricsSchema.optional().describe('Reducer metrics'),
    selectors: z.array(AnnotateSelectorSchema).min(1).optional().describe('Selector annotations'),
  })
  .strict()
  .superRefine((operation, ctx) => {
    if (operation.metrics === undefined && operation.selectors === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'annotate transform requires metrics or selectors',
      });
    }
  })
  .describe('Append group metrics or selector annotations');

/** 内置 data transform schema；以 kind 判别 sort / summarize / select / annotate。 */
export const BuiltinTransformSchema = z
  .discriminatedUnion('kind', [
    SortTransformSchema,
    SummarizeTransformSchema,
    SelectTransformSchema,
    AnnotateTransformSchema,
  ])
  .describe('Built-in data transform operation');

/** 外部 transform operation schema；只校验 JSON 形态和非保留 kind，具体契约由运行时 definition 提供。 */
const ExternalTransformSchema = z
  .object({
    kind: z
      .string()
      .min(1)
      .refine(kind => !RESERVED_TRANSFORM_KINDS.has(kind), {
        message: 'external transform kind must not collide with a built-in or removed transform kind',
      })
      .describe('Discriminator: custom transform kind'),
  })
  .passthrough()
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        message:
          'external transform operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe('Custom transform operation with JSON config');

/** data transform operation schema；包含内置 kind 与外部注册 kind passthrough。 */
export const TransformSchema = z
  .union([BuiltinTransformSchema, ExternalTransformSchema])
  .describe('Built-in or custom data transform operation');

/** transform operation schema 的兼容别名；runtime definition 用它表达单个 operation 契约。 */
export const TransformOperationSchema = TransformSchema;
