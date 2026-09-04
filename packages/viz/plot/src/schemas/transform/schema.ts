import { JsonObjectSchema } from '@retikz/core';
import {
  BuiltinTransformSchema as DataBuiltinTransformSchema,
  DataTransform,
  GroupBySchema,
  ReducerMetricsSchema,
  RESERVED_TRANSFORM_KINDS,
  SelectorOperationSchema,
} from '@retikz/data';
import {
  createOpenStringSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import {
  array,
  boolean,
  discriminatedUnion,
  enum as zodEnum,
  literal,
  looseObject,
  number,
  object,
  record,
  strictObject,
  string,
  tuple,
  union,
} from 'zod';

import {
  BUILTIN_PLOT_TRANSFORM_KINDS,
  DensityBandwidthKind,
  JitterAxis,
  NormalizeBasis,
  PairMeasureOperationKind,
  PlotTransform,
  SmoothMethodKind,
  StackOffset,
} from './constants';

const PlotAcceptedTransformKind = { ...DataTransform, ...PlotTransform } as const;

/** Plot transform kind：保留Data / Plot内置提示并允许注册自定义Definition key */
export const PlotTransformKindSchema = createOpenStringSchema(PlotAcceptedTransformKind).describe(
  'Built-in Data or Plot transform kind, or a custom registered transform kind',
);

export const StackTransformSchema = object({
  kind: literal(PlotTransform.Stack).describe('Discriminator: cumulative stacking within each x group'),
  x: NonBlankStringSchema.optional().describe(
    'Grouping key field: rows sharing this value stack together (the categorical axis field); omit to accumulate all rows into a single cumulative chain (e.g. pie wedges)',
  ),
  y: NonBlankStringSchema.describe('Numeric value field that is accumulated within each x group'),
  groupBy: NonBlankStringSchema.optional().describe(
    'Series field ordering segments within each stack (one segment per distinct value); omit to accumulate in data row order',
  ),
  startField: NonBlankStringSchema.optional().describe(
    'Output field for the lower bound of each segment; default "y0"',
  ),
  endField: NonBlankStringSchema.optional().describe('Output field for the upper bound of each segment; default "y1"'),
  offset: zodEnum(StackOffset)
    .optional()
    .describe(
      'Stack baseline offset: zero accumulates from 0; normalize scales non-negative values to 0..1 and rejects finite negative values; diverging separates positive/negative values; center centers the full stack; overlap draws every segment from 0',
    ),
}).describe('Stack transform: within each x group, accumulate y across series and derive [start, end] bounds per row');

export const BinTransformSchema = strictObject({
  kind: literal(PlotTransform.Bin).describe(
    'Discriminator: bin a continuous field into discrete intervals (changes row count)',
  ),
  field: NonBlankStringSchema.describe(
    'Continuous source field to bin; its value range is the binning domain unless extent is set',
  ),
  count: PositiveIntegerSchema.optional().describe(
    'Target number of bins; mutually exclusive with step / thresholds; default 10 when no strategy is set',
  ),
  step: PositiveNumberSchema.optional().describe(
    'Fixed bin width in data units; bins tile the domain from the lower bound; mutually exclusive with count / thresholds',
  ),
  thresholds: array(number())
    .min(1)
    .optional()
    .describe(
      'Explicit interior boundaries (sorted ascending); K thresholds yield K+1 edges (extent endpoints fill the ends) and K+1 bins; mutually exclusive with count / step',
    ),
  extent: tuple([number(), number()])
    .optional()
    .describe('Override binning domain [min, max]; default = observed min/max of field'),
  nice: boolean()
    .optional()
    .describe('Round bin boundaries to human-friendly values (count strategy only); default true'),
  startField: NonBlankStringSchema.optional().describe('Output field for each bin lower edge; default "binStart"'),
  endField: NonBlankStringSchema.optional().describe('Output field for each bin upper edge; default "binEnd"'),
  metrics: ReducerMetricsSchema.optional().describe(
    'Per-bin reducer metrics using shared reducer operations; default count as "binCount"',
  ),
}).describe(
  'Bin transform: partition a continuous field into intervals, emitting one row per bin with [start, end] edges and reducer metrics',
);

export const EndpointProjectionSchema = strictObject({
  selector: SelectorOperationSchema.describe('Selector choosing the endpoint source row'),
  fields: record(NonBlankStringSchema, NonBlankStringSchema)
    .refine(fields => Object.keys(fields).length > 0, { message: 'endpoint fields must not be empty' })
    .describe(
      'Output field suffix to source row field map; source outputs sourceX/sourceId, target outputs targetX/targetId',
    ),
}).describe('Relation endpoint projection: selects one row per group and maps source fields to endpoint output fields');

export const PairMeasureOperationSchema = union([
  strictObject({
    op: literal(PairMeasureOperationKind.Difference).describe(
      'Pair measure discriminator: compute target minus source for one numeric field',
    ),
    field: NonBlankStringSchema.describe('Numeric field read from the selected source and target rows'),
    as: NonBlankStringSchema.describe('Output field for the numeric difference'),
    labelAs: NonBlankStringSchema.optional().describe(
      'Optional output field for stringified label text derived from the difference',
    ),
    labelPrefix: string().optional().describe('Optional prefix for non-negative label text, commonly "+"'),
  }).describe('Difference pair measure operation'),
]).describe('Pair measure operation computed from selected source and target rows');

export const RelateTransformSchema = strictObject({
  kind: literal(PlotTransform.Relate).describe(
    'Discriminator: derive source-target relation rows from selected data rows',
  ),
  groupBy: GroupBySchema,
  source: EndpointProjectionSchema.describe('Source endpoint selector and field projection'),
  target: EndpointProjectionSchema.describe('Target endpoint selector and field projection'),
  measures: array(PairMeasureOperationSchema)
    .min(1)
    .optional()
    .describe('Optional pair measures derived from selected source and target rows'),
}).describe(
  'Relate transform: select source and target rows per group and emit relation rows consumable by RelationMark',
);

export const NormalizeTransformSchema = object({
  kind: literal(PlotTransform.Normalize).describe('Discriminator: within-group percentage normalization'),
  field: NonBlankStringSchema.describe(
    'Non-negative numeric field whose within-group share is computed; finite negative values are rejected and non-finite values count as zero',
  ),
  groupBy: array(NonBlankStringSchema)
    .min(1)
    .optional()
    .describe(
      'Grouping key fields: rows sharing all these values form one normalization group (composite key); omit to normalize all rows against the global sum',
    ),
  basis: zodEnum(NormalizeBasis)
    .optional()
    .describe("Output scale: 'fraction' -> share in [0,1], 'percent' -> share in [0,100]; default 'fraction'"),
  as: NonBlankStringSchema.optional().describe(
    'Output field for the normalized share; omit to overwrite the input field in place',
  ),
}).describe(
  'Normalize transform: divide each row value by its group sum, yielding a within-group share; row-preserving. Compose before a stack transform for percentage stacking',
);

export const DeriveIntervalTransformSchema = object({
  kind: literal(PlotTransform.DeriveInterval).describe('Discriminator: per-row interval [start, end] derivation'),
  from: NonBlankStringSchema.optional().describe(
    'Value field driving a baseline-to-value interval (start = baseline, end = field value); omit only when using explicit startFrom / endFrom',
  ),
  baseline: number()
    .optional()
    .describe('Baseline the from-value interval starts at; default 0. Finite-only to keep the IR JSON round-trippable'),
  startFrom: NonBlankStringSchema.optional().describe(
    'Explicit two-field mode: field giving the interval start (pairs with endFrom; takes precedence over from / baseline)',
  ),
  endFrom: NonBlankStringSchema.optional().describe(
    'Explicit two-field mode: field giving the interval end (pairs with startFrom)',
  ),
  startField: NonBlankStringSchema.optional().describe(
    'Output field for the interval start; default "y0" (matches interval/sector consumers)',
  ),
  endField: NonBlankStringSchema.optional().describe('Output field for the interval end; default "y1"'),
}).describe(
  'Derive-interval transform: per-row [start, end] from one value field (baseline-to-value) or two explicit fields; row-preserving. Distinct from stack (which accumulates across rows into a cumulative chain)',
);

export const JitterTransformSchema = object({
  kind: literal(PlotTransform.Jitter).describe('Discriminator: deterministic positional jitter'),
  axis: zodEnum(JitterAxis)
    .optional()
    .describe(
      "Which positional field(s) to perturb; default 'x'. The jittered field MUST be a continuous numeric field (v1 jitter is a pre-scale offset in data units)",
    ),
  xField: NonBlankStringSchema.optional().describe(
    'Continuous numeric field jittered on the x axis; default "x". Read when axis is "x" or "both"',
  ),
  yField: NonBlankStringSchema.optional().describe(
    'Continuous numeric field jittered on the y axis; default "y". Read when axis is "y" or "both"',
  ),
  amount: NonNegativeNumberSchema.optional().describe(
    'Maximum absolute offset in DATA units added to each value pre-scale; offsets are drawn uniformly from [-amount, +amount]. Default 1. Data-space only',
  ),
  seed: number()
    .int()
    .optional()
    .describe(
      'Integer seed for the deterministic PRNG (mulberry32); the SAME seed reproduces identical offsets across SSR and hydration. Default 0',
    ),
}).describe(
  'Jitter transform: add a deterministic pseudo-random offset in data units to a continuous numeric positional field; row-preserving and JSON-serializable',
);

export const DensityBandwidthSchema = discriminatedUnion('kind', [
  strictObject({
    kind: literal(DensityBandwidthKind.Silverman).describe(
      'Bandwidth strategy discriminator: compute Gaussian KDE bandwidth with Silverman rule of thumb',
    ),
  }).describe('Silverman bandwidth strategy'),
  strictObject({
    kind: literal(DensityBandwidthKind.Value).describe(
      'Bandwidth strategy discriminator: use an explicit positive numeric bandwidth',
    ),
    value: PositiveNumberSchema.describe('Explicit positive finite KDE bandwidth in source data units'),
  }).describe('Explicit bandwidth strategy'),
]).describe('Density transform bandwidth strategy');

export const DensityTransformSchema = strictObject({
  kind: literal(PlotTransform.Density).describe('Discriminator: sample one-dimensional KDE density rows'),
  field: NonBlankStringSchema.describe('Continuous source field used as the one-dimensional KDE sample value'),
  groupBy: GroupBySchema,
  bandwidth: DensityBandwidthSchema.optional().describe('KDE bandwidth strategy; default Silverman rule of thumb'),
  sampleCount: number()
    .int()
    .min(2)
    .optional()
    .describe('Number of evenly spaced density samples emitted for each group; default 64'),
  extent: tuple([number(), number()])
    .optional()
    .describe('Optional density sampling extent [min, max]; omitted means observed extent padded by three bandwidths'),
  xAs: NonBlankStringSchema.describe('Output field receiving each density sample position'),
  densityAs: NonBlankStringSchema.describe('Output field receiving each KDE density value'),
})
  .superRefine((operation, ctx) => {
    if (operation.extent !== undefined && operation.extent[0] >= operation.extent[1]) {
      ctx.addIssue({
        code: 'custom',
        path: ['extent'],
        message: 'density extent lower bound must be less than upper bound',
      });
    }
    if (operation.xAs === operation.densityAs) {
      ctx.addIssue({
        code: 'custom',
        path: ['densityAs'],
        message: 'density output fields xAs and densityAs must be different',
      });
    }
    for (const [index, field] of (operation.groupBy ?? []).entries()) {
      if (field === operation.xAs || field === operation.densityAs) {
        ctx.addIssue({
          code: 'custom',
          path: ['groupBy', index],
          message: `density output field must not overwrite groupBy field "${field}"`,
        });
      }
    }
  })
  .describe('Density transform: sample one-dimensional Gaussian KDE rows consumable by PathMark');

export const SmoothMethodSchema = discriminatedUnion('kind', [
  strictObject({
    kind: literal(SmoothMethodKind.Linear).describe(
      'Smooth method discriminator: ordinary least-squares linear regression',
    ),
  }).describe('Linear regression smooth method'),
  strictObject({
    kind: literal(SmoothMethodKind.Quadratic).describe(
      'Smooth method discriminator: second-degree polynomial regression',
    ),
  }).describe('Quadratic regression smooth method'),
  strictObject({
    kind: literal(SmoothMethodKind.Polynomial).describe(
      'Smooth method discriminator: configurable-degree polynomial regression',
    ),
    order: number().int().min(2).max(6).optional().describe('Polynomial degree from 2 through 6; default 3'),
  }).describe('Polynomial regression smooth method'),
  strictObject({
    kind: literal(SmoothMethodKind.Logarithmic).describe(
      'Smooth method discriminator: logarithmic regression y = a + b ln(x)',
    ),
  }).describe('Logarithmic regression smooth method'),
  strictObject({
    kind: literal(SmoothMethodKind.Exponential).describe(
      'Smooth method discriminator: exponential regression y = a exp(bx)',
    ),
  }).describe('Exponential regression smooth method'),
  strictObject({
    kind: literal(SmoothMethodKind.Power).describe('Smooth method discriminator: power regression y = a x^b'),
  }).describe('Power regression smooth method'),
]).describe('Smooth transform method strategy');

export const SmoothTransformSchema = strictObject({
  kind: literal(PlotTransform.Smooth).describe('Discriminator: sample trend rows from a fitted smooth model'),
  x: NonBlankStringSchema.describe('Continuous source field used as the independent x value'),
  y: NonBlankStringSchema.describe('Continuous source field used as the dependent y value'),
  groupBy: GroupBySchema,
  method: SmoothMethodSchema.optional().describe('Smooth method; default ordinary least-squares linear regression'),
  sampleCount: number()
    .int()
    .min(2)
    .optional()
    .describe('Number of evenly spaced trend samples emitted for each group; default 64'),
  extent: tuple([number(), number()])
    .optional()
    .describe('Optional trend sampling extent [min, max]; omitted means the observed finite x range'),
  xAs: NonBlankStringSchema.describe('Output field receiving each trend sample x position'),
  yAs: NonBlankStringSchema.describe('Output field receiving each predicted y value'),
})
  .superRefine((operation, ctx) => {
    if (operation.extent !== undefined && operation.extent[0] >= operation.extent[1]) {
      ctx.addIssue({
        code: 'custom',
        path: ['extent'],
        message: 'smooth extent lower bound must be less than upper bound',
      });
    }
    if (operation.xAs === operation.yAs) {
      ctx.addIssue({
        code: 'custom',
        path: ['yAs'],
        message: 'smooth output fields xAs and yAs must be different',
      });
    }
    for (const [index, field] of (operation.groupBy ?? []).entries()) {
      if (field === operation.xAs || field === operation.yAs) {
        ctx.addIssue({
          code: 'custom',
          path: ['groupBy', index],
          message: `smooth output field must not overwrite groupBy field "${field}"`,
        });
      }
    }
  })
  .describe('Smooth transform: sample regression trend rows consumable by PathMark');

export const PlotBuiltinTransformSchema = discriminatedUnion('kind', [
  StackTransformSchema,
  BinTransformSchema,
  NormalizeTransformSchema,
  DeriveIntervalTransformSchema,
  RelateTransformSchema,
  JitterTransformSchema,
  DensityTransformSchema,
  SmoothTransformSchema,
]).describe('Built-in plot transform operation applied through the shared data pipeline');

export const ExternalPlotTransformSchema = looseObject({
  kind: PlotTransformKindSchema.refine(
    kind => !RESERVED_TRANSFORM_KINDS.has(kind) && !BUILTIN_PLOT_TRANSFORM_KINDS.has(kind),
    {
      message: 'external transform kind must not collide with a built-in or removed transform kind',
    },
  ).describe(
    'Discriminator: externally registered transform operation kind; must be a non-blank, non-reserved identifier registered through options.transformDefinitions',
  ),
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
  .describe(
    'Externally registered transform operation: kind is any non-reserved identifier; its config is validated at lowering time against the matching TransformDefinition supplied via options.transformDefinitions',
  );

export const TransformSchema = union([
  DataBuiltinTransformSchema,
  PlotBuiltinTransformSchema,
  ExternalPlotTransformSchema,
]).describe(
  'Plot transform operation: shared data transforms, plot-only built-ins, plus externally registered open config operations validated by a runtime TransformDefinition',
);
