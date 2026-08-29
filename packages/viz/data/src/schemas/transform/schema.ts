import { JsonObjectSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, discriminatedUnion, enum as zodEnum, literal, looseObject, strictObject, union } from 'zod';

import { DataSortOrder, DataTransform, RESERVED_TRANSFORM_KINDS, RowSelectorTie } from './constants';
import { DataTransformKindSchema } from './kind';
import { reducerOutputFieldsOf } from './output-fields';
import { ReducerMetricsSchema } from './reducer';
import { BuiltinSelectorOperationSchemas, SelectorOperationSchema } from './selector';

export const SortTransformSchema = strictObject({
  kind: literal(DataTransform.Sort).describe('Discriminator: sort rows'),
  field: NonBlankStringSchema.describe('Sort field'),
  order: zodEnum(DataSortOrder).optional().describe('Sort direction; default ascending'),
}).describe('Sort rows by one field');

export const GroupBySchema = array(NonBlankStringSchema)
  .optional()
  .describe('Group key fields; omitted or empty means one group');

export const SummarizeTransformSchema = strictObject({
  kind: literal(DataTransform.Summarize).describe('Discriminator: summarize transform'),
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

export const SelectTransformSchema = strictObject({
  kind: literal(DataTransform.Select).describe('Discriminator: select transform'),
  groupBy: GroupBySchema,
  selector: SelectorOperationSchema.describe('Row selector'),
  rankAs: NonBlankStringSchema.optional().describe('One-based rank output field'),
}).describe('Select representative rows per group');

const AnnotateSelectorTieSchema = union([literal(RowSelectorTie.First), literal(RowSelectorTie.Last)])
  .optional()
  .describe('Single-row tie-breaking strategy; default first');

const AnnotateSelectorOperationSchema = discriminatedUnion('kind', [
  BuiltinSelectorOperationSchemas.Min.extend({ tie: AnnotateSelectorTieSchema }),
  BuiltinSelectorOperationSchemas.Max.extend({ tie: AnnotateSelectorTieSchema }),
  BuiltinSelectorOperationSchemas.First,
  BuiltinSelectorOperationSchemas.Last,
  BuiltinSelectorOperationSchemas.Top.extend({
    n: literal(1).describe('Selected row count; fixed to one for annotation'),
    tie: AnnotateSelectorTieSchema,
  }),
  BuiltinSelectorOperationSchemas.Bottom.extend({
    n: literal(1).describe('Selected row count; fixed to one for annotation'),
    tie: AnnotateSelectorTieSchema,
  }),
  BuiltinSelectorOperationSchemas.Nth,
]).describe('Built-in selector operation guaranteed to select at most one row');

export const AnnotateSelectorSchema = strictObject({
  selector: AnnotateSelectorOperationSchema.describe('Single-row selector'),
  as: NonBlankStringSchema.describe('Annotation output field'),
}).describe('Single-row selector annotation');

export const AnnotateTransformSchema = strictObject({
  kind: literal(DataTransform.Annotate).describe('Discriminator: annotate transform'),
  groupBy: GroupBySchema,
  metrics: ReducerMetricsSchema.optional().describe('Reducer metrics'),
  selectors: array(AnnotateSelectorSchema).min(1).optional().describe('Single-row selector annotations'),
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

export const BuiltinTransformSchema = discriminatedUnion('kind', [
  SortTransformSchema,
  SummarizeTransformSchema,
  SelectTransformSchema,
  AnnotateTransformSchema,
]).describe('Built-in data transform operation');

export const ExternalTransformSchema = looseObject({
  kind: DataTransformKindSchema.refine(kind => !RESERVED_TRANSFORM_KINDS.has(kind), {
    message: 'external transform kind must not collide with a built-in or removed transform kind',
  }).describe('Discriminator: custom transform kind'),
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

export const TransformSchema = union([BuiltinTransformSchema, ExternalTransformSchema]).describe(
  'Built-in or custom data transform operation',
);
