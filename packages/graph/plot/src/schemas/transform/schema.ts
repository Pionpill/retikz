import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';
import { PlotTransform, RESERVED_TRANSFORM_KINDS } from './constants';

export const SortTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Sort).describe('Discriminator: reorder rows by a field'),
    field: z.string().min(1).describe('Field path the rows are ordered by'),
    order: z
      .enum(['ascending', 'descending'])
      .optional()
      .describe('Sort direction; default ascending'),
  })
  .describe('Sort transform: stable reorder of the data rows by one field');

export const StackTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Stack).describe('Discriminator: cumulative stacking within each x group'),
    x: z
      .string()
      .min(1)
      .optional()
      .describe('Grouping key field: rows sharing this value stack together (the categorical axis field); omit to accumulate all rows into a single cumulative chain (e.g. pie wedges)'),
    y: z.string().min(1).describe('Numeric value field that is accumulated within each x group'),
    groupBy: z
      .string()
      .min(1)
      .optional()
      .describe('Series field ordering segments within each stack (one segment per distinct value); omit to accumulate in data row order'),
    startField: z.string().min(1).optional().describe('Output field for the lower bound of each segment; default "y0"'),
    endField: z.string().min(1).optional().describe('Output field for the upper bound of each segment; default "y1"'),
    offset: z
      .enum(['zero', 'normalize', 'diverging', 'center', 'overlap'])
      .optional()
      .describe('Stack baseline offset: zero accumulates from 0; normalize scales each stack to 0..1; diverging separates positive/negative values; center centers the full stack; overlap draws every segment from 0'),
  })
  .describe('Stack transform: within each x group, accumulate y across series and derive [start, end] bounds per row');

export const GroupBySchema = z
  .array(z.string().min(1))
  .optional()
  .describe('Grouping key fields; omitted or an empty array means all rows belong to one global group');

export const OrderBySchema = z
  .object({
    field: z.string().min(1).describe('Field path used to order rows'),
    order: z.enum(['ascending', 'descending']).optional().describe('Sort direction; default ascending'),
  })
  .strict()
  .describe('Ordering rule used by row selectors');

const BuiltinReducerOps = ['count', 'sum', 'mean', 'median', 'min', 'max', 'extent', 'quantile'] as const;

const CountReducerOperationSchema = z
  .object({
    op: z.literal('count').describe('Reducer discriminator: count rows in the group'),
    as: z.string().min(1).describe('Output field for the row count'),
  })
  .strict()
  .describe('Count reducer operation');

const FieldReducerOperationSchema = z
  .object({
    op: z.enum(['sum', 'mean', 'median', 'min', 'max', 'extent']).describe('Reducer discriminator: numeric group statistic'),
    field: z.string().min(1).describe('Numeric source field reduced within the group'),
    as: z.string().min(1).describe('Output field for the reduced value'),
  })
  .strict()
  .describe('Field reducer operation');

const QuantileReducerOperationSchema = z
  .object({
    op: z.literal('quantile').describe('Reducer discriminator: numeric quantile within the group'),
    field: z.string().min(1).describe('Numeric source field reduced within the group'),
    p: z.number().min(0).max(1).describe('Quantile probability in [0, 1]'),
    as: z.string().min(1).describe('Output field for the quantile value'),
  })
  .strict()
  .describe('Quantile reducer operation');

const ExternalReducerOperationSchema = z
  .object({
    op: z
      .string()
      .min(1)
      .refine(op => !(BuiltinReducerOps as ReadonlyArray<string>).includes(op), {
        message: 'external reducer op must not collide with a built-in reducer op',
      })
      .describe('Discriminator: externally registered reducer operation key'),
  })
  .passthrough()
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'external reducer operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe('Externally registered reducer operation validated by a runtime StatReducerDefinition');

export const BuiltinReducerOperationSchema = z
  .union([CountReducerOperationSchema, FieldReducerOperationSchema, QuantileReducerOperationSchema])
  .describe('Built-in statistic reducer operation');

export const ReducerOperationSchema = z
  .union([BuiltinReducerOperationSchema, ExternalReducerOperationSchema])
  .describe('Statistic reducer operation used by summarize, annotate, and bin transforms');

const reducerOutputFieldOf = (operation: z.infer<typeof ReducerOperationSchema>): string | undefined => {
  const maybeField = (operation as { as?: unknown }).as;
  return typeof maybeField === 'string' ? maybeField : undefined;
};

const ReducerMetricsSchema = z
  .array(ReducerOperationSchema)
  .min(1)
  .superRefine((metrics, ctx) => {
    const seen = new Set<string>();
    for (let index = 0; index < metrics.length; index++) {
      const field = reducerOutputFieldOf(metrics[index]);
      if (field === undefined) continue;
      if (seen.has(field)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'as'],
          message: `duplicate reducer output field "${field}"`,
        });
      }
      seen.add(field);
    }
  })
  .describe('One or more reducer metrics; output field names must be unique within the transform');

const BuiltinSelectorOps = ['min', 'max', 'first', 'last', 'top', 'bottom', 'nth'] as const;

const MinMaxSelectorOperationSchema = z
  .object({
    op: z.enum(['min', 'max']).describe('Selector discriminator: choose the row with the smallest or largest numeric value'),
    by: z.string().min(1).describe('Numeric field used for min/max comparison'),
    tie: z.enum(['first', 'last', 'all']).optional().describe('Tie-breaking strategy; default first'),
  })
  .strict()
  .describe('Min/max row selector operation');

const FirstLastSelectorOperationSchema = z
  .object({
    op: z.enum(['first', 'last']).describe('Selector discriminator: choose the first or last row'),
    orderBy: z.array(OrderBySchema).min(1).optional().describe('Optional stable ordering before first/last selection; omitted means current row order'),
  })
  .strict()
  .describe('First/last row selector operation');

const TopBottomSelectorOperationSchema = z
  .object({
    op: z.enum(['top', 'bottom']).describe('Selector discriminator: choose top or bottom N rows by a numeric field'),
    by: z.string().min(1).describe('Numeric field used for ranking'),
    n: z.number().int().positive().describe('Number of rows selected per group'),
    tie: z.enum(['first', 'last', 'all']).optional().describe('Tie-breaking strategy around the Nth row; default first'),
  })
  .strict()
  .describe('Top/bottom row selector operation');

const NthSelectorOperationSchema = z
  .object({
    op: z.literal('nth').describe('Selector discriminator: choose a zero-based ordered row index'),
    orderBy: z.array(OrderBySchema).min(1).describe('Stable ordering before choosing the row'),
    index: z.number().int().nonnegative().describe('Zero-based selected row index after ordering'),
  })
  .strict()
  .describe('Nth row selector operation');

const ExternalSelectorOperationSchema = z
  .object({
    op: z
      .string()
      .min(1)
      .refine(op => !(BuiltinSelectorOps as ReadonlyArray<string>).includes(op), {
        message: 'external selector op must not collide with a built-in selector op',
      })
      .describe('Discriminator: externally registered selector operation key'),
  })
  .passthrough()
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'external selector operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe('Externally registered selector operation validated by a runtime RowSelectorDefinition');

export const BuiltinSelectorOperationSchema = z
  .union([MinMaxSelectorOperationSchema, FirstLastSelectorOperationSchema, TopBottomSelectorOperationSchema, NthSelectorOperationSchema])
  .describe('Built-in row selector operation');

export const SelectorOperationSchema = z
  .union([BuiltinSelectorOperationSchema, ExternalSelectorOperationSchema])
  .describe('Row selector operation used by select, annotate, and relate transforms');

export const BinTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Bin).describe('Discriminator: bin a continuous field into discrete intervals (changes row count)'),
    field: z.string().min(1).describe('Continuous source field to bin; its value range is the binning domain unless extent is set'),
    count: z.number().int().positive().optional().describe('Target number of bins; mutually exclusive with step / thresholds; default 10 when no strategy is set'),
    step: z.number().positive().optional().describe('Fixed bin width in data units; bins tile the domain from the lower bound; mutually exclusive with count / thresholds'),
    thresholds: z
      .array(z.number())
      .min(1)
      .optional()
      .describe('Explicit interior boundaries (sorted ascending); K thresholds yield K+1 edges (extent endpoints fill the ends) and K+1 bins; mutually exclusive with count / step'),
    extent: z.tuple([z.number(), z.number()]).optional().describe('Override binning domain [min, max]; default = observed min/max of field'),
    nice: z.boolean().optional().describe('Round bin boundaries to human-friendly values (count strategy only); default true'),
    startField: z.string().min(1).optional().describe('Output field for each bin lower edge; default "binStart"'),
    endField: z.string().min(1).optional().describe('Output field for each bin upper edge; default "binEnd"'),
    metrics: ReducerMetricsSchema.optional().describe('Per-bin reducer metrics using shared reducer operations; default count as "binCount"'),
  })
  .strict()
  .describe(
    'Bin transform: partition a continuous field into intervals, emitting one row per bin with [start, end] edges and reducer metrics',
  );

export const SummarizeTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Summarize).describe('Discriminator: summarize groups into statistic rows'),
    groupBy: GroupBySchema,
    metrics: ReducerMetricsSchema.describe('Reducer metrics emitted on each output group row'),
  })
  .strict()
  .describe('Summarize transform: group rows and emit one row per group with reducer metric fields');

export const SelectTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Select).describe('Discriminator: select representative source rows per group'),
    groupBy: GroupBySchema,
    selector: SelectorOperationSchema.describe('Row selector applied independently to each group'),
    rankAs: z.string().min(1).optional().describe('Optional output field receiving one-based rank among selected rows'),
  })
  .strict()
  .describe('Select transform: choose representative original rows per group while preserving source row fields and provenance');

export const AnnotateSelectorSchema = z
  .object({
    selector: SelectorOperationSchema.describe('Row selector applied to each group'),
    as: z.string().min(1).describe('Output field receiving the selected row value or selector metadata'),
  })
  .strict()
  .describe('Selector annotation operation broadcast to every source row in the group');

export const AnnotateTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Annotate).describe('Discriminator: annotate each input row with group statistics'),
    groupBy: GroupBySchema,
    metrics: ReducerMetricsSchema.optional().describe('Reducer metrics broadcast to every row in the group'),
    selectors: z.array(AnnotateSelectorSchema).min(1).optional().describe('Selector annotations broadcast to every row in the group'),
  })
  .strict()
  .superRefine((operation, ctx) => {
    if (operation.metrics === undefined && operation.selectors === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'annotate transform requires metrics or selectors',
      });
    }
  })
  .describe('Annotate transform: preserve input rows and append group statistics or selector metadata');

export const EndpointProjectionSchema = z
  .object({
    selector: SelectorOperationSchema.describe('Selector choosing the endpoint source row'),
    fields: z
      .record(z.string().min(1), z.string().min(1))
      .refine(fields => Object.keys(fields).length > 0, { message: 'endpoint fields must not be empty' })
      .describe('Output field suffix to source row field map; source outputs sourceX/sourceId, target outputs targetX/targetId'),
  })
  .strict()
  .describe('Relation endpoint projection: selects one row per group and maps source fields to endpoint output fields');

export const PairMeasureOperationSchema = z
  .union([
    z
      .object({
        op: z.literal('difference').describe('Pair measure discriminator: compute target minus source for one numeric field'),
        field: z.string().min(1).describe('Numeric field read from the selected source and target rows'),
        as: z.string().min(1).describe('Output field for the numeric difference'),
        labelAs: z.string().min(1).optional().describe('Optional output field for stringified label text derived from the difference'),
        labelPrefix: z.string().optional().describe('Optional prefix for non-negative label text, commonly "+"'),
      })
      .strict()
      .describe('Difference pair measure operation'),
  ])
  .describe('Pair measure operation computed from selected source and target rows');

export const RelateTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Relate).describe('Discriminator: derive source-target relation rows from selected data rows'),
    groupBy: GroupBySchema,
    source: EndpointProjectionSchema.describe('Source endpoint selector and field projection'),
    target: EndpointProjectionSchema.describe('Target endpoint selector and field projection'),
    measures: z.array(PairMeasureOperationSchema).min(1).optional().describe('Optional pair measures derived from selected source and target rows'),
  })
  .strict()
  .describe('Relate transform: select source and target rows per group and emit relation rows consumable by any mark');

export const NormalizeTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Normalize).describe('Discriminator: within-group percentage normalization'),
    field: z.string().min(1).describe('Numeric field whose within-group share is computed'),
    groupBy: z
      .array(z.string().min(1))
      .min(1)
      .optional()
      .describe('Grouping key fields: rows sharing all these values form one normalization group (composite key); omit to normalize all rows against the global sum'),
    basis: z
      .enum(['fraction', 'percent'])
      .optional()
      .describe("Output scale: 'fraction' -> share in [0,1], 'percent' -> share in [0,100]; default 'fraction'"),
    as: z.string().min(1).optional().describe('Output field for the normalized share; omit to overwrite the input field in place'),
  })
  .describe('Normalize transform: divide each row value by its group sum, yielding a within-group share; row-preserving. Compose before a stack transform for percentage stacking');

export const DeriveIntervalTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.DeriveInterval).describe('Discriminator: per-row interval [start, end] derivation'),
    from: z
      .string()
      .min(1)
      .optional()
      .describe('Value field driving a baseline-to-value interval (start = baseline, end = field value); omit only when using explicit startFrom / endFrom'),
    baseline: z.number().optional().describe('Baseline the from-value interval starts at; default 0. Finite-only to keep the IR JSON round-trippable'),
    startFrom: z.string().min(1).optional().describe('Explicit two-field mode: field giving the interval start (pairs with endFrom; takes precedence over from / baseline)'),
    endFrom: z.string().min(1).optional().describe('Explicit two-field mode: field giving the interval end (pairs with startFrom)'),
    startField: z.string().min(1).optional().describe('Output field for the interval start; default "y0" (matches interval/sector consumers)'),
    endField: z.string().min(1).optional().describe('Output field for the interval end; default "y1"'),
  })
  .describe(
    'Derive-interval transform: per-row [start, end] from one value field (baseline-to-value) or two explicit fields; row-preserving. Distinct from stack (which accumulates across rows into a cumulative chain)',
  );

export const JitterTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Jitter).describe('Discriminator: deterministic positional jitter'),
    axis: z
      .enum(['x', 'y', 'both'])
      .optional()
      .describe("Which positional field(s) to perturb; default 'x'. The jittered field MUST be a continuous numeric field (v1 jitter is a pre-scale offset in data units)"),
    xField: z.string().min(1).optional().describe('Continuous numeric field jittered on the x axis; default "x". Read when axis is "x" or "both"'),
    yField: z.string().min(1).optional().describe('Continuous numeric field jittered on the y axis; default "y". Read when axis is "y" or "both"'),
    amount: z
      .number()

      .nonnegative()
      .optional()
      .describe('Maximum absolute offset in DATA units added to each value pre-scale; offsets are drawn uniformly from [-amount, +amount]. Default 1. Data-space only'),
    seed: z
      .number()
      .int()
      .optional()
      .describe('Integer seed for the deterministic PRNG (mulberry32); the SAME seed reproduces identical offsets across SSR and hydration. Default 0'),
  })
  .describe(
    'Jitter transform: add a deterministic pseudo-random offset in data units to a continuous numeric positional field; row-preserving and JSON-serializable',
  );

export const BuiltinTransformSchema = z
  .discriminatedUnion('kind', [
    SortTransformSchema,
    StackTransformSchema,
    BinTransformSchema,
    SummarizeTransformSchema,
    SelectTransformSchema,
    AnnotateTransformSchema,
    NormalizeTransformSchema,
    DeriveIntervalTransformSchema,
    RelateTransformSchema,
    JitterTransformSchema,
  ])
  .describe('Built-in data transform operation applied before scale / mark; ordered pipeline');

const ExternalTransformSchema = z
  .object({
    kind: z
      .string()
      .min(1)
      .refine(kind => !RESERVED_TRANSFORM_KINDS.has(kind), {
        message: 'external transform kind must not collide with a built-in or removed transform kind',
      })
      .describe('Discriminator: externally registered transform operation kind; must be a non-empty, non-reserved identifier registered through options.transformDefinitions'),
  })
  .passthrough()
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'external transform operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe('Externally registered transform operation: kind is any non-reserved identifier; its config is validated at lowering time against the matching TransformDefinition supplied via options.transformDefinitions');

export const TransformSchema = z
  .union([BuiltinTransformSchema, ExternalTransformSchema])
  .describe('Data transform operation: built-in transform configs plus externally registered kind passthrough operations validated by a runtime TransformDefinition');

export const TransformOperationSchema = TransformSchema;
