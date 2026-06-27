import type { z } from 'zod';
import type {
  AnnotateSelectorSchema,
  AnnotateTransformSchema,
  BinTransformSchema,
  BuiltinTransformSchema,
  DeriveIntervalTransformSchema,
  EndpointProjectionSchema,
  JitterTransformSchema,
  NormalizeTransformSchema,
  OrderBySchema,
  PairMeasureOperationSchema,
  ReducerOperationSchema,
  RelateTransformSchema,
  SelectTransformSchema,
  SelectorOperationSchema,
  SortTransformSchema,
  StackTransformSchema,
  SummarizeTransformSchema,
  TransformSchema,
} from './schema';

/** sort transform */
export type SortTransform = z.infer<typeof SortTransformSchema>;
/** stack transform */
export type StackTransform = z.infer<typeof StackTransformSchema>;
/** bin transform（连续分箱，改行数） */
export type BinTransform = z.infer<typeof BinTransformSchema>;
/** reducer operation（统计规约子算子） */
export type ReducerOperation = z.infer<typeof ReducerOperationSchema>;
/** row selector operation（代表行选择子算子） */
export type SelectorOperation = z.infer<typeof SelectorOperationSchema>;
/** selector ordering spec */
export type OrderBy = z.infer<typeof OrderBySchema>;
/** summarize transform（分组统计，改行数） */
export type SummarizeTransform = z.infer<typeof SummarizeTransformSchema>;
/** select transform（选择代表原始行，可能改行数） */
export type SelectTransform = z.infer<typeof SelectTransformSchema>;
/** annotate selector spec */
export type AnnotateSelector = z.infer<typeof AnnotateSelectorSchema>;
/** annotate transform（统计回填，保行数） */
export type AnnotateTransform = z.infer<typeof AnnotateTransformSchema>;
/** normalize transform（组内百分比归一化，保行数） */
export type NormalizeTransform = z.infer<typeof NormalizeTransformSchema>;
/** derive-interval transform（单行派生区间，保行数） */
export type DeriveIntervalTransform = z.infer<typeof DeriveIntervalTransformSchema>;
/** relate endpoint projection（每组选择 source / target 行并映射字段） */
export type EndpointProjection = z.infer<typeof EndpointProjectionSchema>;
/** pair measure（从 source / target 行派生差值等字段） */
export type PairMeasureOperation = z.infer<typeof PairMeasureOperationSchema>;
/** relate transform（从数据动态派生 relation rows） */
export type RelateTransform = z.infer<typeof RelateTransformSchema>;
/** jitter transform（确定性位置抖动，保行数） */
export type JitterTransform = z.infer<typeof JitterTransformSchema>;
/** 内置 transform operation（sort / stack / bin / summarize / select / annotate / normalize / derive-interval / relate / jitter） */
export type BuiltinTransform = z.infer<typeof BuiltinTransformSchema>;
/** transform operation（内置 ∪ 外部注册 kind passthrough） */
export type Transform = z.infer<typeof TransformSchema>;
/** transform pipeline operation；definition 运行时用 schema 精确收窄。 */
export type TransformOperation = Transform;
