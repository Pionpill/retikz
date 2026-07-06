import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

import {
  BUILTIN_REDUCER_OPERATION_KINDS,
  BUILTIN_SELECTOR_OPS,
  DataSortOrder,
  DataTransform,
  FieldReducerOperationKind,
  FirstLastSelectorOp,
  MinMaxSelectorOp,
  ReducerOperationKind,
  RESERVED_TRANSFORM_KINDS,
  RowSelectorTie,
  SelectorOp,
  TopBottomSelectorOp,
} from './constants';

export const SortTransformSchema = z
  .object({
    kind: z.literal(DataTransform.Sort).describe('Discriminator: reorder rows by a field'),
    field: z.string().min(1).describe('Field path the rows are ordered by'),
    order: z.enum(DataSortOrder).optional().describe('Sort direction; default ascending'),
  })
  .describe('Sort transform: stable reorder of the data rows by one field');

export const GroupBySchema = z
  .array(z.string().min(1))
  .optional()
  .describe('Grouping key fields; omitted or an empty array means all rows belong to one global group');

export const OrderBySchema = z
  .object({
    field: z.string().min(1).describe('Field path used to order rows'),
    order: z.enum(DataSortOrder).optional().describe('Sort direction; default ascending'),
  })
  .strict()
  .describe('Ordering rule used by row selectors');

const CountReducerOperationSchema = z
  .object({
    op: z.literal(ReducerOperationKind.Count).describe('Reducer discriminator: count rows in the group'),
    as: z.string().min(1).describe('Output field for the row count'),
  })
  .strict()
  .describe('Count reducer operation');

const FieldReducerOperationSchema = z
  .object({
    op: z.enum(FieldReducerOperationKind).describe('Reducer discriminator: numeric group statistic'),
    field: z.string().min(1).describe('Numeric source field reduced within the group'),
    as: z.string().min(1).describe('Output field for the reduced value'),
  })
  .strict()
  .describe('Field reducer operation');

const QuantileReducerOperationSchema = z
  .object({
    op: z.literal(ReducerOperationKind.Quantile).describe('Reducer discriminator: numeric quantile within the group'),
    field: z.string().min(1).describe('Numeric source field reduced within the group'),
    p: z.number().min(0).max(1).describe('Quantile probability in [0, 1]'),
    as: z.string().min(1).describe('Output field for the quantile value'),
  })
  .strict()
  .describe('Quantile reducer operation');

export const QuantileBandPointOutputSchema = z
  .object({
    p: z
      .number()
      .min(0)
      .max(1)
      .describe('Quantile probability in [0, 1] for an additional point emitted from the same sorted values'),
    as: z.string().min(1).describe('Output field for this quantile point'),
  })
  .strict()
  .describe('Quantile-band point output');

export const QuantileBandWhiskerSpecSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('minMax').describe('Whisker strategy discriminator: use finite min and max as whiskers'),
      })
      .strict()
      .describe('Min/max whisker strategy'),
    z
      .object({
        kind: z
          .literal('spread')
          .describe('Whisker strategy discriminator: derive fences from lower and upper quantile band boundaries'),
        factor: z
          .number()
          .nonnegative()
          .optional()
          .describe('Multiplier applied to the quantile band spread; default 1.5'),
      })
      .strict()
      .describe('Spread fence whisker strategy'),
  ])
  .describe('Quantile-band whisker strategy');

export const QuantileBandOutputsSchema = z
  .object({
    lower: z.string().min(1).describe('Output field for the lower quantile band boundary'),
    upper: z.string().min(1).describe('Output field for the upper quantile band boundary'),
    points: z
      .array(QuantileBandPointOutputSchema)
      .min(1)
      .optional()
      .describe('Additional quantile points emitted from the same sorted values'),
    spread: z.string().min(1).optional().describe('Optional output field for upper minus lower'),
    lowerFence: z.string().min(1).optional().describe('Optional output field for the lower spread fence'),
    upperFence: z.string().min(1).optional().describe('Optional output field for the upper spread fence'),
    whiskerMin: z
      .string()
      .min(1)
      .optional()
      .describe('Optional output field for the finite minimum or the minimum value inside the lower fence'),
    whiskerMax: z
      .string()
      .min(1)
      .optional()
      .describe('Optional output field for the finite maximum or the maximum value inside the upper fence'),
    min: z.string().min(1).optional().describe('Optional output field for the finite minimum value'),
    max: z.string().min(1).optional().describe('Optional output field for the finite maximum value'),
    count: z.string().min(1).optional().describe('Optional output field for the count of finite values'),
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

export const QuantileBandReducerOperationSchema = z
  .object({
    op: z
      .literal(ReducerOperationKind.QuantileBand)
      .describe('Reducer discriminator: parameterized quantile band within the group'),
    field: z.string().min(1).describe('Numeric source field reduced within the group'),
    lowerP: z.number().min(0).max(1).describe('Lower quantile probability in [0, 1]; must be less than upperP'),
    upperP: z.number().min(0).max(1).describe('Upper quantile probability in [0, 1]; must be greater than lowerP'),
    outputs: QuantileBandOutputsSchema.describe('Explicit output field names for the quantile band reducer'),
    whisker: QuantileBandWhiskerSpecSchema.optional().describe(
      'Optional whisker strategy; omitted means no whisker or fence values are derived',
    ),
  })
  .strict()
  .refine(operation => operation.lowerP < operation.upperP, {
    message: 'lowerP must be less than upperP',
    path: ['lowerP'],
  })
  .describe('Quantile-band reducer operation');

const ExternalReducerOperationSchema = z
  .object({
    op: z
      .string()
      .min(1)
      .refine(op => !BUILTIN_REDUCER_OPERATION_KINDS.has(op), {
        message: 'external reducer op must not collide with a built-in reducer op',
      })
      .describe('Discriminator: externally registered reducer operation key'),
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
  .describe('Externally registered reducer operation validated by a runtime StatisticsReducerDefinition');

export const BuiltinReducerOperationSchema = z
  .union([
    CountReducerOperationSchema,
    FieldReducerOperationSchema,
    QuantileReducerOperationSchema,
    QuantileBandReducerOperationSchema,
  ])
  .describe('Built-in statistic reducer operation');

export const ReducerOperationSchema = z
  .union([BuiltinReducerOperationSchema, ExternalReducerOperationSchema])
  .describe('Statistic reducer operation used by summarize, annotate, and host-defined transforms');

const reducerOutputFieldsOf = (
  operation: z.infer<typeof ReducerOperationSchema>,
): Array<{ field: string; path: Array<string | number> }> => {
  if (operation.op === ReducerOperationKind.QuantileBand) {
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
  .describe('One or more reducer metrics; output field names must be unique within the transform');

const MinMaxSelectorOperationSchema = z
  .object({
    op: z
      .enum(MinMaxSelectorOp)
      .describe('Selector discriminator: choose the row with the smallest or largest numeric value'),
    by: z.string().min(1).describe('Numeric field used for min/max comparison'),
    tie: z.enum(RowSelectorTie).optional().describe('Tie-breaking strategy; default first'),
  })
  .strict()
  .describe('Min/max row selector operation');

const FirstLastSelectorOperationSchema = z
  .object({
    op: z.enum(FirstLastSelectorOp).describe('Selector discriminator: choose the first or last row'),
    orderBy: z
      .array(OrderBySchema)
      .min(1)
      .optional()
      .describe('Optional stable ordering before first/last selection; omitted means current row order'),
  })
  .strict()
  .describe('First/last row selector operation');

const TopBottomSelectorOperationSchema = z
  .object({
    op: z.enum(TopBottomSelectorOp).describe('Selector discriminator: choose top or bottom N rows by a numeric field'),
    by: z.string().min(1).describe('Numeric field used for ranking'),
    n: z.number().int().positive().describe('Number of rows selected per group'),
    tie: z
      .enum(RowSelectorTie)
      .optional()
      .describe('Tie-breaking strategy around the Nth row; default first'),
  })
  .strict()
  .describe('Top/bottom row selector operation');

const NthSelectorOperationSchema = z
  .object({
    op: z.literal(SelectorOp.Nth).describe('Selector discriminator: choose a zero-based ordered row index'),
    orderBy: z.array(OrderBySchema).min(1).describe('Stable ordering before choosing the row'),
    index: z.number().int().nonnegative().describe('Zero-based selected row index after ordering'),
  })
  .strict()
  .describe('Nth row selector operation');

export const OutsideQuantileBandBoundarySpecSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z
          .literal('band')
          .describe(
            'Boundary strategy discriminator: select rows outside the lower and upper quantile band boundaries',
          ),
      })
      .strict()
      .describe('Quantile band boundary strategy'),
    z
      .object({
        kind: z
          .literal('spread')
          .describe('Boundary strategy discriminator: select rows outside spread-derived fences'),
        factor: z
          .number()
          .nonnegative()
          .optional()
          .describe('Multiplier applied to the quantile band spread; default 1.5'),
      })
      .strict()
      .describe('Spread fence boundary strategy'),
  ])
  .describe('Outside quantile-band boundary strategy');

export const OutsideQuantileBandSelectorOperationSchema = z
  .object({
    op: z
      .literal(SelectorOp.OutsideQuantileBand)
      .describe('Selector discriminator: choose rows outside a parameterized quantile band'),
    field: z.string().min(1).describe('Numeric source field used to compute quantile band boundaries'),
    lowerP: z.number().min(0).max(1).describe('Lower quantile probability in [0, 1]; must be less than upperP'),
    upperP: z.number().min(0).max(1).describe('Upper quantile probability in [0, 1]; must be greater than lowerP'),
    boundary: OutsideQuantileBandBoundarySpecSchema.optional().describe(
      'Boundary strategy; omitted means quantile band boundaries',
    ),
  })
  .strict()
  .refine(operation => operation.lowerP < operation.upperP, {
    message: 'lowerP must be less than upperP',
    path: ['lowerP'],
  })
  .describe('Outside quantile-band row selector operation');

const ExternalSelectorOperationSchema = z
  .object({
    op: z
      .string()
      .min(1)
      .refine(op => !BUILTIN_SELECTOR_OPS.has(op), {
        message: 'external selector op must not collide with a built-in selector op',
      })
      .describe('Discriminator: externally registered selector operation key'),
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
  .describe('Externally registered selector operation validated by a runtime RowSelectorDefinition');

export const BuiltinSelectorOperationSchema = z
  .union([
    MinMaxSelectorOperationSchema,
    FirstLastSelectorOperationSchema,
    TopBottomSelectorOperationSchema,
    NthSelectorOperationSchema,
    OutsideQuantileBandSelectorOperationSchema,
  ])
  .describe('Built-in row selector operation');

export const SelectorOperationSchema = z
  .union([BuiltinSelectorOperationSchema, ExternalSelectorOperationSchema])
  .describe('Row selector operation used by select, annotate, and host-defined transforms');

export const SummarizeTransformSchema = z
  .object({
    kind: z.literal(DataTransform.Summarize).describe('Discriminator: summarize groups into statistic rows'),
    groupBy: GroupBySchema,
    metrics: ReducerMetricsSchema.describe('Reducer metrics emitted on each output group row'),
  })
  .strict()
  .describe('Summarize transform: group rows and emit one row per group with reducer metric fields');

export const SelectTransformSchema = z
  .object({
    kind: z.literal(DataTransform.Select).describe('Discriminator: select representative source rows per group'),
    groupBy: GroupBySchema,
    selector: SelectorOperationSchema.describe('Row selector applied independently to each group'),
    rankAs: z.string().min(1).optional().describe('Optional output field receiving one-based rank among selected rows'),
  })
  .strict()
  .describe(
    'Select transform: choose representative original rows per group while preserving source row fields and provenance',
  );

export const AnnotateSelectorSchema = z
  .object({
    selector: SelectorOperationSchema.describe('Row selector applied to each group'),
    as: z.string().min(1).describe('Output field receiving the selected row value or selector metadata'),
  })
  .strict()
  .describe('Selector annotation operation broadcast to every source row in the group');

export const AnnotateTransformSchema = z
  .object({
    kind: z.literal(DataTransform.Annotate).describe('Discriminator: annotate each input row with group statistics'),
    groupBy: GroupBySchema,
    metrics: ReducerMetricsSchema.optional().describe('Reducer metrics broadcast to every row in the group'),
    selectors: z
      .array(AnnotateSelectorSchema)
      .min(1)
      .optional()
      .describe('Selector annotations broadcast to every row in the group'),
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
  .describe('Annotate transform: preserve input rows and append group statistics or selector metadata');


export const BuiltinTransformSchema = z
  .discriminatedUnion('kind', [SortTransformSchema, SummarizeTransformSchema, SelectTransformSchema, AnnotateTransformSchema])
  .describe('Built-in data transform operation applied by the shared data pipeline');

const ExternalTransformSchema = z
  .object({
    kind: z
      .string()
      .min(1)
      .refine(kind => !RESERVED_TRANSFORM_KINDS.has(kind), {
        message: 'external transform kind must not collide with a built-in or removed transform kind',
      })
      .describe(
        'Discriminator: externally registered transform operation kind; must be a non-empty, non-reserved identifier registered through options.transformDefinitions',
      ),
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
  .describe(
    'Externally registered transform operation: kind is any non-reserved identifier; its config is validated at lowering time against the matching TransformDefinition supplied via options.transformDefinitions',
  );

export const TransformSchema = z
  .union([BuiltinTransformSchema, ExternalTransformSchema])
  .describe(
    'Data transform operation: built-in transform configs plus externally registered kind passthrough operations validated by a runtime TransformDefinition',
  );

export const TransformOperationSchema = TransformSchema;
