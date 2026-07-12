import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

import { DataSortOrder, DataTransform, RESERVED_TRANSFORM_KINDS, RowSelectorTie } from './constants';
import { reducerOutputFieldsOf } from './output-fields';
import { ReducerMetricsSchema } from './reducer';
import { BuiltinSelectorOperationSchemas, SelectorOperationSchema } from './selector';

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
  .superRefine((operation, ctx) => {
    const groupFields = new Set(operation.groupBy ?? []);
    operation.metrics.forEach((metric, metricIndex) => {
      for (const { field, path } of reducerOutputFieldsOf(metric)) {
        if (!groupFields.has(field)) continue;
        ctx.addIssue({
          code: 'custom',
          path: ['metrics', metricIndex, ...path],
          message: `reducer output field "${field}" must not collide with a groupBy field`,
        });
      }
    });
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

/** annotate selector 的单行平局策略 schema。 */
const AnnotateSelectorTieSchema = z
  .union([z.literal(RowSelectorTie.First), z.literal(RowSelectorTie.Last)])
  .optional()
  .describe('Single-row tie-breaking strategy; default first');

/** annotate 可用的单行 selector operation schema。 */
const AnnotateSelectorOperationSchema = z
  .discriminatedUnion('kind', [
    BuiltinSelectorOperationSchemas.Min.extend({ tie: AnnotateSelectorTieSchema }),
    BuiltinSelectorOperationSchemas.Max.extend({ tie: AnnotateSelectorTieSchema }),
    BuiltinSelectorOperationSchemas.First,
    BuiltinSelectorOperationSchemas.Last,
    BuiltinSelectorOperationSchemas.Top.extend({
      n: z.literal(1).describe('Selected row count; fixed to one for annotation'),
      tie: AnnotateSelectorTieSchema,
    }),
    BuiltinSelectorOperationSchemas.Bottom.extend({
      n: z.literal(1).describe('Selected row count; fixed to one for annotation'),
      tie: AnnotateSelectorTieSchema,
    }),
    BuiltinSelectorOperationSchemas.Nth,
  ])
  .describe('Built-in selector operation guaranteed to select at most one row');

/** annotate transform selector 回填配置 schema。 */
export const AnnotateSelectorSchema = z
  .strictObject({
    selector: AnnotateSelectorOperationSchema.describe('Single-row selector'),
    as: z.string().min(1).describe('Annotation output field'),
  })
  .describe('Single-row selector annotation');

/** annotate transform schema；保留输入行并追加 reducer / selector 派生字段。 */
export const AnnotateTransformSchema = z
  .strictObject({
    kind: z.literal(DataTransform.Annotate).describe('Discriminator: annotate transform'),
    groupBy: GroupBySchema,
    metrics: ReducerMetricsSchema.optional().describe('Reducer metrics'),
    selectors: z.array(AnnotateSelectorSchema).min(1).optional().describe('Single-row selector annotations'),
  })
  .superRefine((operation, ctx) => {
    if (operation.metrics === undefined && operation.selectors === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'annotate transform requires metrics or selectors',
      });
    }
    const outputFields = new Set(
      (operation.metrics ?? []).flatMap(metric => reducerOutputFieldsOf(metric).map(output => output.field)),
    );
    operation.selectors?.forEach((selector, selectorIndex) => {
      if (outputFields.has(selector.as)) {
        ctx.addIssue({
          code: 'custom',
          path: ['selectors', selectorIndex, 'as'],
          message: `duplicate annotate output field "${selector.as}"`,
        });
      }
      outputFields.add(selector.as);
    });
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
