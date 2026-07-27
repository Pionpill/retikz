import { JsonObjectSchema } from '@retikz/core';
import {
  BuiltinTransformSchema as DataBuiltinTransformSchema,
  GroupBySchema,
  ReducerMetricsSchema,
  RESERVED_TRANSFORM_KINDS,
  SelectorOperationSchema,
} from '@retikz/data';
import { z } from 'zod';

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
      .enum(StackOffset)
      .optional()
      .describe(
        'Stack baseline offset: zero accumulates from 0; normalize scales non-negative values to 0..1 and rejects finite negative values; diverging separates positive/negative values; center centers the full stack; overlap draws every segment from 0',
      ),
  })
  .describe('Stack transform: within each x group, accumulate y across series and derive [start, end] bounds per row');

export const BinTransformSchema = z
  .strictObject({
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
  .describe(
    'Bin transform: partition a continuous field into intervals, emitting one row per bin with [start, end] edges and reducer metrics',
  );

export const EndpointProjectionSchema = z
  .strictObject({
    selector: SelectorOperationSchema.describe('Selector choosing the endpoint source row'),
    fields: z
      .record(z.string().min(1), z.string().min(1))
      .refine(fields => Object.keys(fields).length > 0, { message: 'endpoint fields must not be empty' })
      .describe(
        'Output field suffix to source row field map; source outputs sourceX/sourceId, target outputs targetX/targetId',
      ),
  })
  .describe('Relation endpoint projection: selects one row per group and maps source fields to endpoint output fields');

export const PairMeasureOperationSchema = z
  .union([
    z
      .strictObject({
        op: z
          .literal(PairMeasureOperationKind.Difference)
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
      .describe('Difference pair measure operation'),
  ])
  .describe('Pair measure operation computed from selected source and target rows');

export const RelateTransformSchema = z
  .strictObject({
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
  .describe(
    'Relate transform: select source and target rows per group and emit relation rows consumable by RelationMark',
  );

export const NormalizeTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Normalize).describe('Discriminator: within-group percentage normalization'),
    field: z
      .string()
      .min(1)
      .describe(
        'Non-negative numeric field whose within-group share is computed; finite negative values are rejected and non-finite values count as zero',
      ),
    groupBy: z
      .array(z.string().min(1))
      .min(1)
      .optional()
      .describe(
        'Grouping key fields: rows sharing all these values form one normalization group (composite key); omit to normalize all rows against the global sum',
      ),
    basis: z
      .enum(NormalizeBasis)
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
      .enum(JitterAxis)
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
      .strictObject({
        kind: z
          .literal(DensityBandwidthKind.Silverman)
          .describe('Bandwidth strategy discriminator: compute Gaussian KDE bandwidth with Silverman rule of thumb'),
      })
      .describe('Silverman bandwidth strategy'),
    z
      .strictObject({
        kind: z
          .literal(DensityBandwidthKind.Value)
          .describe('Bandwidth strategy discriminator: use an explicit positive numeric bandwidth'),
        value: z.number().positive().describe('Explicit positive finite KDE bandwidth in source data units'),
      })
      .describe('Explicit bandwidth strategy'),
  ])
  .describe('Density transform bandwidth strategy');

export const DensityTransformSchema = z
  .strictObject({
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

export const SmoothMethodSpecSchema = z
  .discriminatedUnion('kind', [
    z
      .strictObject({
        kind: z
          .literal(SmoothMethodKind.Linear)
          .describe('Smooth method discriminator: ordinary least-squares linear regression'),
      })
      .describe('Linear regression smooth method'),
  ])
  .describe('Smooth transform method strategy');

export const SmoothTransformSchema = z
  .strictObject({
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
  .describe('Smooth transform: sample linear regression trend rows consumable by PathMark');

export const PlotBuiltinTransformSchema = z
  .discriminatedUnion('kind', [
    StackTransformSchema,
    BinTransformSchema,
    NormalizeTransformSchema,
    DeriveIntervalTransformSchema,
    RelateTransformSchema,
    JitterTransformSchema,
    DensityTransformSchema,
    SmoothTransformSchema,
  ])
  .describe('Built-in plot transform operation applied through the shared data pipeline');

const ExternalTransformSchema = z
  .looseObject({
    kind: z
      .string()
      .min(1)
      .refine(kind => !RESERVED_TRANSFORM_KINDS.has(kind) && !BUILTIN_PLOT_TRANSFORM_KINDS.has(kind), {
        message: 'external transform kind must not collide with a built-in or removed transform kind',
      })
      .describe(
        'Discriminator: externally registered transform operation kind; must be a non-empty, non-reserved identifier registered through options.transformDefinitions',
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

export const TransformSchema = z
  .union([DataBuiltinTransformSchema, PlotBuiltinTransformSchema, ExternalTransformSchema])
  .describe(
    'Plot transform operation: shared data transforms, plot-only built-ins, plus externally registered open config operations validated by a runtime TransformDefinition',
  );
