import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

import { PlotTransform, RESERVED_TRANSFORM_KINDS } from './constants';

export const SortTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Sort).describe('Discriminator: reorder rows by a field'),
    field: z.string().min(1).describe('Field path the rows are ordered by'),
    order: z.enum(['ascending', 'descending']).optional().describe('Sort direction; default ascending'),
  })
  .describe('Sort transform: stable reorder of the data rows by one field');

export const StackTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Stack).describe('Discriminator: cumulative stacking within each x group'),
    x: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Grouping key field: rows sharing this value stack together (the categorical axis field); omit to accumulate all rows into a single cumulative chain (e.g. pie wedges)',
      ),
    y: z.string().min(1).describe('Numeric value field that is accumulated within each x group'),
    groupBy: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Series field ordering segments within each stack (one segment per distinct value); omit to accumulate in data row order',
      ),
    startField: z.string().min(1).optional().describe('Output field for the lower bound of each segment; default "y0"'),
    endField: z.string().min(1).optional().describe('Output field for the upper bound of each segment; default "y1"'),
    offset: z
      .enum(['zero', 'normalize', 'diverging', 'center', 'overlap'])
      .optional()
      .describe(
        'Stack baseline offset: zero accumulates from 0; normalize scales each stack to 0..1; diverging separates positive/negative values; center centers the full stack; overlap draws every segment from 0',
      ),
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

const BuiltinReducerOps = [
  'count',
  'sum',
  'mean',
  'median',
  'min',
  'max',
  'extent',
  'quantile',
  'quantile-band',
] as const;

const CountReducerOperationSchema = z
  .object({
    op: z.literal('count').describe('Reducer discriminator: count rows in the group'),
    as: z.string().min(1).describe('Output field for the row count'),
  })
  .strict()
  .describe('Count reducer operation');

const FieldReducerOperationSchema = z
  .object({
    op: z
      .enum(['sum', 'mean', 'median', 'min', 'max', 'extent'])
      .describe('Reducer discriminator: numeric group statistic'),
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
          code: z.ZodIssueCode.custom,
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
    op: z.literal('quantile-band').describe('Reducer discriminator: parameterized quantile band within the group'),
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
  .describe('Statistic reducer operation used by summarize, annotate, and bin transforms');

const reducerOutputFieldsOf = (
  operation: z.infer<typeof ReducerOperationSchema>,
): Array<{ field: string; path: Array<string | number> }> => {
  if (operation.op === 'quantile-band') {
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

const ReducerMetricsSchema = z
  .array(ReducerOperationSchema)
  .min(1)
  .superRefine((metrics, ctx) => {
    const seen = new Set<string>();
    for (let index = 0; index < metrics.length; index++) {
      for (const { field, path } of reducerOutputFieldsOf(metrics[index])) {
        if (seen.has(field)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, ...path],
            message: `duplicate reducer output field "${field}"`,
          });
        }
        seen.add(field);
      }
    }
  })
  .describe('One or more reducer metrics; output field names must be unique within the transform');

const BuiltinSelectorOps = ['min', 'max', 'first', 'last', 'top', 'bottom', 'nth', 'outside-quantile-band'] as const;

const MinMaxSelectorOperationSchema = z
  .object({
    op: z
      .enum(['min', 'max'])
      .describe('Selector discriminator: choose the row with the smallest or largest numeric value'),
    by: z.string().min(1).describe('Numeric field used for min/max comparison'),
    tie: z.enum(['first', 'last', 'all']).optional().describe('Tie-breaking strategy; default first'),
  })
  .strict()
  .describe('Min/max row selector operation');

const FirstLastSelectorOperationSchema = z
  .object({
    op: z.enum(['first', 'last']).describe('Selector discriminator: choose the first or last row'),
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
    op: z.enum(['top', 'bottom']).describe('Selector discriminator: choose top or bottom N rows by a numeric field'),
    by: z.string().min(1).describe('Numeric field used for ranking'),
    n: z.number().int().positive().describe('Number of rows selected per group'),
    tie: z
      .enum(['first', 'last', 'all'])
      .optional()
      .describe('Tie-breaking strategy around the Nth row; default first'),
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
      .literal('outside-quantile-band')
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
  .describe('Row selector operation used by select, annotate, and relate transforms');

export const BinTransformSchema = z
  .object({
    kind: z
      .literal(PlotTransform.Bin)
      .describe('Discriminator: bin a continuous field into discrete intervals (changes row count)'),
    field: z
      .string()
      .min(1)
      .describe('Continuous source field to bin; its value range is the binning domain unless extent is set'),
    count: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Target number of bins; mutually exclusive with step / thresholds; default 10 when no strategy is set'),
    step: z
      .number()
      .positive()
      .optional()
      .describe(
        'Fixed bin width in data units; bins tile the domain from the lower bound; mutually exclusive with count / thresholds',
      ),
    thresholds: z
      .array(z.number())
      .min(1)
      .optional()
      .describe(
        'Explicit interior boundaries (sorted ascending); K thresholds yield K+1 edges (extent endpoints fill the ends) and K+1 bins; mutually exclusive with count / step',
      ),
    extent: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('Override binning domain [min, max]; default = observed min/max of field'),
    nice: z
      .boolean()
      .optional()
      .describe('Round bin boundaries to human-friendly values (count strategy only); default true'),
    startField: z.string().min(1).optional().describe('Output field for each bin lower edge; default "binStart"'),
    endField: z.string().min(1).optional().describe('Output field for each bin upper edge; default "binEnd"'),
    metrics: ReducerMetricsSchema.optional().describe(
      'Per-bin reducer metrics using shared reducer operations; default count as "binCount"',
    ),
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
    kind: z.literal(PlotTransform.Annotate).describe('Discriminator: annotate each input row with group statistics'),
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
      .describe(
        'Output field suffix to source row field map; source outputs sourceX/sourceId, target outputs targetX/targetId',
      ),
  })
  .strict()
  .describe('Relation endpoint projection: selects one row per group and maps source fields to endpoint output fields');

export const PairMeasureOperationSchema = z
  .union([
    z
      .object({
        op: z
          .literal('difference')
          .describe('Pair measure discriminator: compute target minus source for one numeric field'),
        field: z.string().min(1).describe('Numeric field read from the selected source and target rows'),
        as: z.string().min(1).describe('Output field for the numeric difference'),
        labelAs: z
          .string()
          .min(1)
          .optional()
          .describe('Optional output field for stringified label text derived from the difference'),
        labelPrefix: z.string().optional().describe('Optional prefix for non-negative label text, commonly "+"'),
      })
      .strict()
      .describe('Difference pair measure operation'),
  ])
  .describe('Pair measure operation computed from selected source and target rows');

export const RelateTransformSchema = z
  .object({
    kind: z
      .literal(PlotTransform.Relate)
      .describe('Discriminator: derive source-target relation rows from selected data rows'),
    groupBy: GroupBySchema,
    source: EndpointProjectionSchema.describe('Source endpoint selector and field projection'),
    target: EndpointProjectionSchema.describe('Target endpoint selector and field projection'),
    measures: z
      .array(PairMeasureOperationSchema)
      .min(1)
      .optional()
      .describe('Optional pair measures derived from selected source and target rows'),
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
      .describe(
        'Grouping key fields: rows sharing all these values form one normalization group (composite key); omit to normalize all rows against the global sum',
      ),
    basis: z
      .enum(['fraction', 'percent'])
      .optional()
      .describe("Output scale: 'fraction' -> share in [0,1], 'percent' -> share in [0,100]; default 'fraction'"),
    as: z
      .string()
      .min(1)
      .optional()
      .describe('Output field for the normalized share; omit to overwrite the input field in place'),
  })
  .describe(
    'Normalize transform: divide each row value by its group sum, yielding a within-group share; row-preserving. Compose before a stack transform for percentage stacking',
  );

export const DeriveIntervalTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.DeriveInterval).describe('Discriminator: per-row interval [start, end] derivation'),
    from: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Value field driving a baseline-to-value interval (start = baseline, end = field value); omit only when using explicit startFrom / endFrom',
      ),
    baseline: z
      .number()
      .optional()
      .describe(
        'Baseline the from-value interval starts at; default 0. Finite-only to keep the IR JSON round-trippable',
      ),
    startFrom: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Explicit two-field mode: field giving the interval start (pairs with endFrom; takes precedence over from / baseline)',
      ),
    endFrom: z
      .string()
      .min(1)
      .optional()
      .describe('Explicit two-field mode: field giving the interval end (pairs with startFrom)'),
    startField: z
      .string()
      .min(1)
      .optional()
      .describe('Output field for the interval start; default "y0" (matches interval/sector consumers)'),
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
      .describe(
        "Which positional field(s) to perturb; default 'x'. The jittered field MUST be a continuous numeric field (v1 jitter is a pre-scale offset in data units)",
      ),
    xField: z
      .string()
      .min(1)
      .optional()
      .describe('Continuous numeric field jittered on the x axis; default "x". Read when axis is "x" or "both"'),
    yField: z
      .string()
      .min(1)
      .optional()
      .describe('Continuous numeric field jittered on the y axis; default "y". Read when axis is "y" or "both"'),
    amount: z
      .number()

      .nonnegative()
      .optional()
      .describe(
        'Maximum absolute offset in DATA units added to each value pre-scale; offsets are drawn uniformly from [-amount, +amount]. Default 1. Data-space only',
      ),
    seed: z
      .number()
      .int()
      .optional()
      .describe(
        'Integer seed for the deterministic PRNG (mulberry32); the SAME seed reproduces identical offsets across SSR and hydration. Default 0',
      ),
  })
  .describe(
    'Jitter transform: add a deterministic pseudo-random offset in data units to a continuous numeric positional field; row-preserving and JSON-serializable',
  );

export const DensityBandwidthSpecSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z
          .literal('silverman')
          .describe('Bandwidth strategy discriminator: compute Gaussian KDE bandwidth with Silverman rule of thumb'),
      })
      .strict()
      .describe('Silverman bandwidth strategy'),
    z
      .object({
        kind: z
          .literal('value')
          .describe('Bandwidth strategy discriminator: use an explicit positive numeric bandwidth'),
        value: z.number().positive().describe('Explicit positive finite KDE bandwidth in source data units'),
      })
      .strict()
      .describe('Explicit bandwidth strategy'),
  ])
  .describe('Density transform bandwidth strategy');

export const DensityTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Density).describe('Discriminator: sample one-dimensional KDE density rows'),
    field: z.string().min(1).describe('Continuous source field used as the one-dimensional KDE sample value'),
    groupBy: GroupBySchema,
    bandwidth: DensityBandwidthSpecSchema.optional().describe(
      'KDE bandwidth strategy; default Silverman rule of thumb',
    ),
    sampleCount: z
      .number()
      .int()
      .min(2)
      .optional()
      .describe('Number of evenly spaced density samples emitted for each group; default 64'),
    extent: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe(
        'Optional density sampling extent [min, max]; omitted means observed extent padded by three bandwidths',
      ),
    xAs: z.string().min(1).describe('Output field receiving each density sample position'),
    densityAs: z.string().min(1).describe('Output field receiving each KDE density value'),
  })
  .strict()
  .superRefine((operation, ctx) => {
    if (operation.extent !== undefined && operation.extent[0] >= operation.extent[1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['extent'],
        message: 'density extent lower bound must be less than upper bound',
      });
    }
    if (operation.xAs === operation.densityAs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['densityAs'],
        message: 'density output fields xAs and densityAs must be different',
      });
    }
    for (const [index, field] of (operation.groupBy ?? []).entries()) {
      if (field === operation.xAs || field === operation.densityAs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['groupBy', index],
          message: `density output field must not overwrite groupBy field "${field}"`,
        });
      }
    }
  })
  .describe('Density transform: sample one-dimensional Gaussian KDE rows consumable by PathMark');

export const SmoothMethodSpecSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('linear').describe('Smooth method discriminator: ordinary least-squares linear regression'),
      })
      .strict()
      .describe('Linear regression smooth method'),
  ])
  .describe('Smooth transform method strategy');

export const SmoothTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Smooth).describe('Discriminator: sample trend rows from a fitted smooth model'),
    x: z.string().min(1).describe('Continuous source field used as the independent x value'),
    y: z.string().min(1).describe('Continuous source field used as the dependent y value'),
    groupBy: GroupBySchema,
    method: SmoothMethodSpecSchema.optional().describe(
      'Smooth method; default ordinary least-squares linear regression',
    ),
    sampleCount: z
      .number()
      .int()
      .min(2)
      .optional()
      .describe('Number of evenly spaced trend samples emitted for each group; default 64'),
    extent: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('Optional trend sampling extent [min, max]; omitted means the observed finite x range'),
    xAs: z.string().min(1).describe('Output field receiving each trend sample x position'),
    yAs: z.string().min(1).describe('Output field receiving each predicted y value'),
  })
  .strict()
  .superRefine((operation, ctx) => {
    if (operation.extent !== undefined && operation.extent[0] >= operation.extent[1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['extent'],
        message: 'smooth extent lower bound must be less than upper bound',
      });
    }
    if (operation.xAs === operation.yAs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['yAs'],
        message: 'smooth output fields xAs and yAs must be different',
      });
    }
    for (const [index, field] of (operation.groupBy ?? []).entries()) {
      if (field === operation.xAs || field === operation.yAs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['groupBy', index],
          message: `smooth output field must not overwrite groupBy field "${field}"`,
        });
      }
    }
  })
  .describe('Smooth transform: sample linear regression trend rows consumable by PathMark');

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
    DensityTransformSchema,
    SmoothTransformSchema,
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
      .describe(
        'Discriminator: externally registered transform operation kind; must be a non-empty, non-reserved identifier registered through options.transformDefinitions',
      ),
  })
  .passthrough()
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
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
