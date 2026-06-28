import type { z } from 'zod';
import type {
  AnnotateSelectorSchema,
  AnnotateTransformSchema,
  BinTransformSchema,
  BuiltinTransformSchema,
  DensityBandwidthSpecSchema,
  DensityTransformSchema,
  DeriveIntervalTransformSchema,
  EndpointProjectionSchema,
  JitterTransformSchema,
  NormalizeTransformSchema,
  OrderBySchema,
  OutsideQuantileBandSelectorOperationSchema,
  PairMeasureOperationSchema,
  QuantileBandReducerOperationSchema,
  ReducerOperationSchema,
  RelateTransformSchema,
  SelectTransformSchema,
  SelectorOperationSchema,
  SmoothMethodSpecSchema,
  SmoothTransformSchema,
  SortTransformSchema,
  StackTransformSchema,
  SummarizeTransformSchema,
  TransformSchema,
} from './schema';

/** 排序变换（稳定排序，保行数）。 */
export type SortTransform = z.infer<typeof SortTransformSchema>;
/** 堆叠变换（跨行累积区间，保行数）。 */
export type StackTransform = z.infer<typeof StackTransformSchema>;
/** 分箱变换（连续分箱，改行数）。 */
export type BinTransform = z.infer<typeof BinTransformSchema>;
/** reducer operation（统计规约子算子）。 */
export type ReducerOperation = z.infer<typeof ReducerOperationSchema>;
/** quantile-band reducer operation（参数化分位区间规约）。 */
export type QuantileBandReducerOperation = z.infer<typeof QuantileBandReducerOperationSchema>;
/** row selector operation（代表行选择子算子）。 */
export type SelectorOperation = z.infer<typeof SelectorOperationSchema>;
/** outside-quantile-band selector operation（分位区间外原始行选择）。 */
export type OutsideQuantileBandSelectorOperation = z.infer<typeof OutsideQuantileBandSelectorOperationSchema>;
/** selector 排序规则（代表行选择前的稳定排序规则）。 */
export type OrderBy = z.infer<typeof OrderBySchema>;
/** 汇总变换（分组统计，改行数）。 */
export type SummarizeTransform = z.infer<typeof SummarizeTransformSchema>;
/** 选择变换（选择代表原始行，可能改行数）。 */
export type SelectTransform = z.infer<typeof SelectTransformSchema>;
/** annotate selector 配置（代表行选择结果回填规则）。 */
export type AnnotateSelector = z.infer<typeof AnnotateSelectorSchema>;
/** 标注变换（统计回填，保行数）。 */
export type AnnotateTransform = z.infer<typeof AnnotateTransformSchema>;
/** 归一化变换（组内百分比归一化，保行数）。 */
export type NormalizeTransform = z.infer<typeof NormalizeTransformSchema>;
/** 区间派生变换（单行派生区间，保行数）。 */
export type DeriveIntervalTransform = z.infer<typeof DeriveIntervalTransformSchema>;
/** relate 端点投影（每组选择 source / target 行并映射字段）。 */
export type EndpointProjection = z.infer<typeof EndpointProjectionSchema>;
/** 配对度量（从 source / target 行派生差值等字段）。 */
export type PairMeasureOperation = z.infer<typeof PairMeasureOperationSchema>;
/** 关系变换（从数据动态派生 relation rows）。 */
export type RelateTransform = z.infer<typeof RelateTransformSchema>;
/** 抖点变换（确定性位置抖动，保行数）。 */
export type JitterTransform = z.infer<typeof JitterTransformSchema>;
/** density 带宽策略（Silverman 默认或显式正数带宽）。 */
export type DensityBandwidthSpec = z.infer<typeof DensityBandwidthSpecSchema>;
/** density 变换（一维 KDE 采样，改行数）。 */
export type DensityTransform = z.infer<typeof DensityTransformSchema>;
/** smooth 方法策略（首轮为线性回归）。 */
export type SmoothMethodSpec = z.infer<typeof SmoothMethodSpecSchema>;
/** smooth 变换（线性趋势线采样，改行数）。 */
export type SmoothTransform = z.infer<typeof SmoothTransformSchema>;
/** 内置 transform operation（sort / stack / bin / summarize / select / annotate / normalize / derive-interval / relate / jitter / density / smooth）。 */
export type BuiltinTransform = z.infer<typeof BuiltinTransformSchema>;
/** transform operation（内置 ∪ 外部注册 kind passthrough）。 */
export type Transform = z.infer<typeof TransformSchema>;
/** transform 管线 operation；定义对象在运行时用 schema 精确收窄。 */
export type TransformOperation = Transform;
