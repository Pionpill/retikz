import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';
import { BUILTIN_TRANSFORM_KINDS, PlotTransform } from './constants';

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
    reduce: z.enum(['count', 'sum', 'mean', 'min', 'max']).optional().describe('Per-bin reducer over reduceField; default count (frequency)'),
    reduceField: z.string().min(1).optional().describe('Numeric field reduced per bin; required for sum/mean/min/max, ignored for count'),
    startField: z.string().min(1).optional().describe('Output field for each bin lower edge; default "binStart"'),
    endField: z.string().min(1).optional().describe('Output field for each bin upper edge; default "binEnd"'),
    valueField: z.string().min(1).optional().describe('Output field for the per-bin reduced value; default "binValue"'),
  })
  .describe(
    'Bin transform: partition a continuous field into N intervals, emitting exactly N rows (one per bin, including empty bins whose reduced value is 0) with [start, end] edges and a reduced value',
  );

export const AggregateTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Aggregate).describe('Discriminator: group rows and reduce to one row per group (changes row count)'),
    groupBy: z.array(z.string().min(1)).min(1).describe('Categorical key fields; rows sharing all key values form one group (group keys are carried onto the output row)'),
    reduce: z.enum(['sum', 'mean', 'count', 'min', 'max']).describe('Reducer applied within each group'),
    field: z.string().min(1).optional().describe('Numeric field reduced per group; required for sum/mean/min/max, ignored for count'),
    as: z.string().min(1).optional().describe('Output field for the reduced value; default = reduce + capitalized field (e.g. "sumRevenue"), or "count" for count'),
  })
  .describe('Aggregate transform: groupBy + reducer, producing one output row per group carrying group keys plus the reduced value');

export const NormalizeTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Normalize).describe('Discriminator: within-group percentage normalization'),
    field: z.string().min(1).describe('Numeric field whose within-group share is computed'),
    groupBy: z
      .array(z.string().min(1))
      .min(1)
      .optional()
      .describe('Grouping key fields: rows sharing all these values form one normalization group (composite key, aligned with aggregate.groupBy); omit to normalize all rows against the global sum'),
    basis: z
      .enum(['fraction', 'percent'])
      .optional()
      .describe("Output scale: 'fraction' → share in [0,1], 'percent' → share in [0,100]; default 'fraction'"),
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
      .describe('Value field driving a baseline→value interval (start = baseline, end = field value); omit only when using explicit startFrom / endFrom'),
    baseline: z.number().finite().optional().describe('Baseline the from-value interval starts at; default 0. Finite-only to keep the IR JSON round-trippable'),
    startFrom: z.string().min(1).optional().describe('Explicit two-field mode: field giving the interval start (pairs with endFrom; takes precedence over from / baseline)'),
    endFrom: z.string().min(1).optional().describe('Explicit two-field mode: field giving the interval end (pairs with startFrom)'),
    startField: z.string().min(1).optional().describe('Output field for the interval start; default "y0" (matches interval/sector consumers)'),
    endField: z.string().min(1).optional().describe('Output field for the interval end; default "y1"'),
  })
  .describe(
    'Derive-interval transform: per-row [start, end] from one value field (baseline→value) or two explicit fields; row-preserving. Distinct from stack (which accumulates ACROSS rows into a cumulative chain). Feeds interval / rect / sector / gantt bound fields',
  );

export const RelationEndpointSelectorSchema = z
  .object({
    select: z
      .enum(['min', 'max', 'first', 'last'])
      .describe('Endpoint row selector: min/max by a numeric field, or first/last in row order or sorted by an optional field'),
    by: z.string().min(1).optional().describe('Field used for min/max comparison or optional first/last sorting'),
    groupBy: z.array(z.string().min(1)).min(1).optional().describe('Optional endpoint grouping fields; omitted endpoints inherit the transform-level groupBy'),
    tie: z.enum(['first', 'last']).optional().describe('Tie-breaking strategy for min/max selectors; default first'),
    fields: z
      .record(z.string().min(1), z.string().min(1))
      .refine(fields => Object.keys(fields).length > 0, { message: 'relation endpoint fields must not be empty' })
      .describe('Output field suffix to source row field map; source outputs sourceX/sourceId, target outputs targetX/targetId'),
  })
  .strict()
  .superRefine((selector, ctx) => {
    if ((selector.select === 'min' || selector.select === 'max') && selector.by === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['by'],
        message: 'relation endpoint min/max selectors require by',
      });
    }
  })
  .describe('Relation endpoint selector: picks one row per group and maps selected row fields to generated relation row fields');

export const RelationMeasureSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('difference').describe('Discriminator: compute target minus source for one numeric field'),
        field: z.string().min(1).describe('Numeric field read from the selected source and target rows'),
        as: z.string().min(1).optional().describe('Output field for the numeric difference; default "delta"'),
        labelAs: z.string().min(1).optional().describe('Optional output field for stringified label text derived from the difference'),
        labelPrefix: z.string().optional().describe('Optional prefix for non-negative label text, commonly "+"'),
      })
      .strict()
      .describe('Difference relation measure: target field value minus source field value'),
  ])
  .describe('Relation measure computed from selected source and target rows');

export const DeriveRelationTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.DeriveRelation).describe('Discriminator: derive source-target relation rows from selected data rows'),
    source: RelationEndpointSelectorSchema.describe('Source endpoint selector'),
    target: RelationEndpointSelectorSchema.describe('Target endpoint selector'),
    groupBy: z.array(z.string().min(1)).min(1).optional().describe('Optional transform-level grouping fields; endpoint selectors inherit this when their own groupBy is omitted'),
    measure: RelationMeasureSchema.optional().describe('Optional measure derived from the selected source and target rows'),
  })
  .strict()
  .describe('Derive-relation transform: select source and target rows per group and emit relation rows consumed by RelationMark');

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
      .finite()
      .nonnegative()
      .optional()
      .describe('Maximum absolute offset in DATA units added to each value pre-scale; offsets are drawn uniformly from [-amount, +amount]. Default 1. Data-space only: categorical band-internal (screen-space) jitter is out of scope'),
    seed: z
      .number()
      .int()
      .optional()
      .describe('Integer seed for the deterministic PRNG (mulberry32); the SAME seed reproduces identical offsets across SSR and hydration. Default 0. No function is ever stored (IR stays JSON-serializable)'),
  })
  .describe(
    'Jitter transform: add a deterministic pseudo-random offset (in DATA units, pre-scale) to a CONTINUOUS numeric positional field to de-overlap scatter; row-preserving. Operates purely in the numeric data space — it cannot offset categorical/string fields, and categorical band-internal spreading (a post-scale screen-space mechanism) is out of scope. Randomness is rebuilt at runtime from a serializable integer seed + a fixed PRNG, never a stored function — preserving SSR / locator parity',
  );

export const BuiltinTransformSchema = z
  .discriminatedUnion('kind', [
    SortTransformSchema,
    StackTransformSchema,
    BinTransformSchema,
    AggregateTransformSchema,
    NormalizeTransformSchema,
    DeriveIntervalTransformSchema,
    DeriveRelationTransformSchema,
    JitterTransformSchema,
  ])
  .describe('Built-in data transform operation applied before scale / mark; ordered pipeline. sort / stack / normalize / derive-interval / derive-relation / jitter preserve or derive rows; bin / aggregate reduce rows');

const ExternalTransformSchema = z
  .object({
    kind: z
      .string()
      .min(1)
      .refine(kind => !BUILTIN_TRANSFORM_KINDS.has(kind), {
        message: 'external transform kind must not collide with a built-in transform kind',
      })
      .describe('Discriminator: externally registered transform operation kind; must be a non-empty, non-built-in identifier registered through options.transformDefinitions'),
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
  .describe('Externally registered transform operation: kind is any non-built-in identifier; its config is validated at lowering time against the matching TransformDefinition supplied via options.transformDefinitions');

export const TransformSchema = z
  .union([BuiltinTransformSchema, ExternalTransformSchema])
  .describe('Data transform operation: built-in transform configs plus externally registered kind passthrough operations validated by a runtime TransformDefinition');

export const TransformOperationSchema = TransformSchema;
