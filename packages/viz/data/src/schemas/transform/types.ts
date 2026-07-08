import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  DataSortOrder,
  DataTransform,
  FieldReducerOperationKind,
  FirstLastSelectorOp,
  MinMaxSelectorOp,
  ReducerOperationKind,
  RowSelectorTie,
  SelectorOp,
  TopBottomSelectorOp,
} from './constants';
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

/** transform operation kind 取值。 */
export type DataTransformValue = ValueOf<typeof DataTransform>;

/** data 排序方向取值。 */
export type DataSortOrderValue = ValueOf<typeof DataSortOrder>;

/** 内置统计 reducer operation op 取值。 */
export type ReducerOperationKindValue = ValueOf<typeof ReducerOperationKind>;

/** 读取 numeric field 的内置统计 reducer operation op 取值。 */
export type FieldReducerOperationKindValue = ValueOf<typeof FieldReducerOperationKind>;

/** 内置 row selector operation op 取值。 */
export type SelectorOpValue = ValueOf<typeof SelectorOp>;

/** 按数值字段取极值的 row selector operation op 取值。 */
export type MinMaxSelectorOpValue = ValueOf<typeof MinMaxSelectorOp>;

/** 按现有顺序或显式排序取行的 row selector operation op 取值。 */
export type FirstLastSelectorOpValue = ValueOf<typeof FirstLastSelectorOp>;

/** 按排序名次取行的 row selector operation op 取值。 */
export type TopBottomSelectorOpValue = ValueOf<typeof TopBottomSelectorOp>;

/** row selector 平局处理策略值。 */
export type RowSelectorTieValue = ValueOf<typeof RowSelectorTie>;

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
