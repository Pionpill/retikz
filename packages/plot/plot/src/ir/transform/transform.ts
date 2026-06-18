import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * transform 类型关键字（暴露给用户；裸 `'sort'` / `'stack'` 同样可用）
 * @description 数据变换 op 的判别字段，成员里写 z.literal(PlotTransform.x)；后续加 filter / aggregate / bin…
 */
export const PlotTransform = {
  /** 按字段排序 */
  Sort: 'sort',
  /** 堆叠：每个 x 分组内按系列累加，派生 [y0, y1] */
  Stack: 'stack',
  /** 连续字段分箱：N 行观测 → M 箱，每箱产出 start/end 边界 + 箱内规约值（histogram 底座 / rect 显式区间边来源；改行数） */
  Bin: 'bin',
  /** 分组聚合：groupBy 字段分组 + 规约（sum/mean/count/min/max）→ 每组一行（改行数） */
  Aggregate: 'aggregate',
  /** 组内百分比归一化：同组各行 value / 组总和 → 比例（保行数） */
  Normalize: 'normalize',
  /** 单行派生区间：from 字段 → [start, end]（baseline→value 或两字段；保行数） */
  DeriveInterval: 'derive-interval',
  /** 位置抖动：可序列化 seed + 确定性 PRNG 加随机偏移（v1 仅连续数值数据空间，保行数） */
  Jitter: 'jitter',
} as const;

/** transform 类型 */
export type PlotTransformValue = ValueOf<typeof PlotTransform>;

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

export const TransformSchema = z
  .discriminatedUnion('kind', [SortTransformSchema, StackTransformSchema, BinTransformSchema, AggregateTransformSchema, NormalizeTransformSchema, DeriveIntervalTransformSchema, JitterTransformSchema])
  .describe('Data transform op applied before scale / mark; ordered pipeline. sort / stack / normalize / derive-interval / jitter preserve row count; bin / aggregate reduce it');

/** sort transform */
export type SortTransform = z.infer<typeof SortTransformSchema>;
/** stack transform */
export type StackTransform = z.infer<typeof StackTransformSchema>;
/** bin transform（连续分箱，改行数） */
export type BinTransform = z.infer<typeof BinTransformSchema>;
/** aggregate transform（分组聚合，改行数） */
export type AggregateTransform = z.infer<typeof AggregateTransformSchema>;
/** normalize transform（组内百分比归一化，保行数） */
export type NormalizeTransform = z.infer<typeof NormalizeTransformSchema>;
/** derive-interval transform（单行派生区间，保行数） */
export type DeriveIntervalTransform = z.infer<typeof DeriveIntervalTransformSchema>;
/** jitter transform（确定性位置抖动，保行数） */
export type JitterTransform = z.infer<typeof JitterTransformSchema>;
/** transform op（sort / stack / bin / aggregate / normalize / derive-interval / jitter） */
export type Transform = z.infer<typeof TransformSchema>;
