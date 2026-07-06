import type { z } from 'zod';

import type {
  AnnotateSelectorSchema,
  AnnotateTransformSchema,
  BuiltinTransformSchema,
  OrderBySchema,
  OutsideQuantileBandSelectorOperationSchema,
  QuantileBandReducerOperationSchema,
  ReducerMetricsSchema,
  ReducerOperationSchema,
  SelectorOperationSchema,
  SelectTransformSchema,
  SortTransformSchema,
  SummarizeTransformSchema,
  TransformSchema,
} from './schema';

/** 排序变换（稳定排序，保行数）。 */
export type SortTransform = z.infer<typeof SortTransformSchema>;
/** reducer operation（统计规约子算子）。 */
export type ReducerOperation = z.infer<typeof ReducerOperationSchema>;
/** reducer metrics 列表。 */
export type ReducerMetrics = z.infer<typeof ReducerMetricsSchema>;
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
/** 内置 transform operation（sort / summarize / select / annotate）。 */
export type BuiltinTransform = z.infer<typeof BuiltinTransformSchema>;
/** transform operation（内置 ∪ 外部注册 kind passthrough）。 */
export type Transform = z.infer<typeof TransformSchema>;
/** transform 管线 operation；定义对象在运行时用 schema 精确收窄。 */
export type TransformOperation = Transform;
