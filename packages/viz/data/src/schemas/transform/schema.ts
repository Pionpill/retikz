import {
  NonNegativeNumberSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
  JsonValueSchema,
  NonBlankStringSchema,
} from '@retikz/foundation';
import {
  boolean,
  number,
  object,
  record,
  string,
  tuple,
  array,
  discriminatedUnion,
  enum as zodEnum,
  literal,
  looseObject,
  strictObject,
  union,
} from 'zod';

import { RegressionMethodSchema } from '../regression';
import {
  DensityBandwidthKind,
  JitterAxis,
  NormalizeBasis,
  PairMeasureOperationKind,
  StackOffset,
  DataSortOrder,
  DataTransform,
  RESERVED_TRANSFORM_KINDS,
  RowSelectorTie,
} from './constants';
import { DataTransformKindSchema } from './kind';
import { reducerOutputFieldsOf } from './output-fields';
import { ReducerMetricsSchema } from './reducer';
import { BuiltinSelectorOperationSchemas, SelectorOperationSchema } from './selector';

/** 校验按单字段及指定方向排序的数据变换 */
export const SortTransformSchema = strictObject({
  kind: literal(DataTransform.Sort).describe('Discriminator: sort rows'),
  field: NonBlankStringSchema.describe('Sort field'),
  order: zodEnum(DataSortOrder).optional().describe('Sort direction; default ascending'),
}).describe('Sort rows by one field');

/** 校验分组字段列表，省略或空列表表示所有行属于同一组 */
export const GroupBySchema = array(NonBlankStringSchema)
  .optional()
  .describe('Group key fields; omitted or empty means one group');

/** 校验将分组数据归约为指标行的操作，指标输出字段不得覆盖分组字段 */
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

/** 校验按组选择代表行并可选输出一基排名的操作 */
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

/** 校验单行选择器及写入注解结果的字段 */
export const AnnotateSelectorSchema = strictObject({
  selector: AnnotateSelectorOperationSchema.describe('Single-row selector'),
  as: NonBlankStringSchema.describe('Annotation output field'),
}).describe('Single-row selector annotation');

/** 校验为行追加分组指标或选择器注解的操作，拒绝重复输出字段 */
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

/** 按分组累计数值并生成每行起止字段的变换配置 */
export const StackTransformSchema = object({
  kind: literal(DataTransform.Stack).describe('Discriminator: cumulative stacking within each x group'),
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

/** 连续字段分桶并生成桶边界与统计结果的变换配置 */
export const BinTransformSchema = strictObject({
  kind: literal(DataTransform.Bin).describe(
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

/** 从选中端点行映射字段的配置 */
export const EndpointProjectionSchema = strictObject({
  selector: SelectorOperationSchema.describe('Selector choosing the endpoint source row'),
  fields: record(NonBlankStringSchema, NonBlankStringSchema)
    .refine(fields => Object.keys(fields).length > 0, { message: 'endpoint fields must not be empty' })
    .describe(
      'Output field suffix to source row field map; source outputs sourceX/sourceId, target outputs targetX/targetId',
    ),
}).describe('Relation endpoint projection: selects one row per group and maps source fields to endpoint output fields');

/** 从选中的两端行派生差值与文本字段的子算子配置 */
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

/** 按组选择 source / target 并生成配对结果行的变换配置 */
export const RelateTransformSchema = strictObject({
  kind: literal(DataTransform.Relate).describe(
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
  'Relate transform: select source and target rows per group and emit relation rows with projected endpoint fields',
);

/** 将非负数值转换为组内占比的变换配置 */
export const NormalizeTransformSchema = object({
  kind: literal(DataTransform.Normalize).describe('Discriminator: within-group percentage normalization'),
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

/** 从单值与基线或双端点字段逐行派生区间的变换配置 */
export const DeriveIntervalTransformSchema = object({
  kind: literal(DataTransform.DeriveInterval).describe('Discriminator: per-row interval [start, end] derivation'),
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
  startField: NonBlankStringSchema.optional().describe('Output field for the interval start; default "y0"'),
  endField: NonBlankStringSchema.optional().describe('Output field for the interval end; default "y1"'),
}).describe(
  'Derive-interval transform: per-row [start, end] from one value field (baseline-to-value) or two explicit fields; row-preserving. Distinct from stack (which accumulates across rows into a cumulative chain)',
);

/** 在数据单位中对数值字段施加确定性扰动的变换配置 */
export const JitterTransformSchema = object({
  kind: literal(DataTransform.Jitter).describe('Discriminator: deterministic positional jitter'),
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

/** Gaussian KDE 的自动或显式带宽配置 */
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

/** 按组生成一维 Gaussian KDE 采样行的变换配置 */
export const DensityTransformSchema = strictObject({
  kind: literal(DataTransform.Density).describe('Discriminator: sample one-dimensional KDE density rows'),
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
  .describe('Density transform: sample one-dimensional Gaussian KDE rows');

/** 按组拟合并生成预测采样行的变换配置 */
export const SmoothTransformSchema = strictObject({
  kind: literal(DataTransform.Smooth).describe('Discriminator: sample trend rows from a fitted smooth model'),
  x: NonBlankStringSchema.describe('Continuous source field used as the independent x value'),
  y: NonBlankStringSchema.describe('Continuous source field used as the dependent y value'),
  groupBy: GroupBySchema,
  method: RegressionMethodSchema.optional().describe('Smooth method; default ordinary least-squares linear regression'),
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
  .describe('Smooth transform: sample regression trend rows');

/** 校验按 kind 区分的内置数据变换操作 */
export const BuiltinTransformSchema = discriminatedUnion('kind', [
  SortTransformSchema,
  SummarizeTransformSchema,
  SelectTransformSchema,
  AnnotateTransformSchema,
  StackTransformSchema,
  BinTransformSchema,
  NormalizeTransformSchema,
  DeriveIntervalTransformSchema,
  RelateTransformSchema,
  JitterTransformSchema,
  DensityTransformSchema,
  SmoothTransformSchema,
]).describe('Built-in data transform operation');

const ExternalTransformObjectSchema = looseObject({
  kind: DataTransformKindSchema.refine(kind => !RESERVED_TRANSFORM_KINDS.has(kind), {
    message: 'external transform kind must not collide with a built-in or removed transform kind',
  }).describe('Discriminator: custom transform kind'),
});

/** 校验带 JSON 配置的自定义数据变换操作 */
export const ExternalTransformSchema = ExternalTransformObjectSchema.catchall(JsonValueSchema).describe(
  'Custom transform operation with JSON config',
);

/** 校验内置或自定义的数据变换声明 */
export const TransformSchema = union([BuiltinTransformSchema, ExternalTransformSchema]).describe(
  'Built-in or custom data transform operation',
);
