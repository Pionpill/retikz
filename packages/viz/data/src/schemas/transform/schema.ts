import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

import { DataSortOrder, DataTransform, RESERVED_TRANSFORM_KINDS } from './constants';
import { ReducerMetricsSchema } from './reducer';
import { SelectorOperationSchema } from './selector';

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

/** summarize transform schema；按 groupBy 分组并输出 reducer metrics 行。 */
export const SummarizeTransformSchema = z
  .strictObject({
    kind: z.literal(DataTransform.Summarize).describe('Discriminator: summarize transform'),
    groupBy: GroupBySchema,
    metrics: ReducerMetricsSchema.describe('Reducer metrics'),
  })
  .describe('Group rows into metric rows');

/** select transform schema；按 groupBy 分组后输出 selector 选中的原始行。 */
export const SelectTransformSchema = z
  .strictObject({
    kind: z.literal(DataTransform.Select).describe('Discriminator: select transform'),
    groupBy: GroupBySchema,
    selector: SelectorOperationSchema.describe('Row selector'),
    rankAs: z.string().min(1).optional().describe('One-based rank output field'),
  })
  .describe('Select representative rows per group');

/** annotate transform selector 回填配置 schema。 */
export const AnnotateSelectorSchema = z
  .strictObject({
    selector: SelectorOperationSchema.describe('Row selector'),
    as: z.string().min(1).describe('Annotation output field'),
  })
  .describe('Selector annotation');

/** annotate transform schema；保留输入行并追加 reducer / selector 派生字段。 */
export const AnnotateTransformSchema = z
  .strictObject({
    kind: z.literal(DataTransform.Annotate).describe('Discriminator: annotate transform'),
    groupBy: GroupBySchema,
    metrics: ReducerMetricsSchema.optional().describe('Reducer metrics'),
    selectors: z.array(AnnotateSelectorSchema).min(1).optional().describe('Selector annotations'),
  })
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
  .looseObject({
    kind: z
      .string()
      .min(1)
      .refine(kind => !RESERVED_TRANSFORM_KINDS.has(kind), {
        message: 'external transform kind must not collide with a built-in or removed transform kind',
      })
      .describe('Discriminator: custom transform kind'),
  })
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

/** data transform operation schema；包含内置 kind 与外部注册 kind 开放配置对象。 */
export const TransformSchema = z
  .union([BuiltinTransformSchema, ExternalTransformSchema])
  .describe('Built-in or custom data transform operation');

/** transform operation schema 的兼容别名；runtime definition 用它表达单个 operation 契约。 */
export const TransformOperationSchema = TransformSchema;
