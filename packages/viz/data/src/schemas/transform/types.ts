import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  DataSortOrder,
  DataTransform,
  FieldReducerOperationKind,
  FirstLastSelectorOperationKind,
  MinMaxSelectorOperationKind,
  ReducerOperationKind,
  RowSelectorTie,
  SelectorOperationKind,
  TopBottomSelectorOperationKind,
} from './constants';
import type { QuantileBandReducerOperationSchema, ReducerMetricsSchema, ReducerOperationSchema } from './reducer';
import type {
  AnnotateSelectorSchema,
  AnnotateTransformSchema,
  BuiltinTransformSchema,
  SelectTransformSchema,
  SortTransformSchema,
  SummarizeTransformSchema,
  TransformSchema,
} from './schema';
import type { OrderBySchema, OutsideQuantileBandSelectorOperationSchema, SelectorOperationSchema } from './selector';

/** transform operation kind 取值。 */
export type DataTransformValue = ValueOf<typeof DataTransform>;

/** data 排序方向取值。 */
export type DataSortOrderValue = ValueOf<typeof DataSortOrder>;

/** 内置统计 reducer operation kind 取值。 */
export type ReducerOperationKindValue = ValueOf<typeof ReducerOperationKind>;

/** 读取 numeric field 的内置统计 reducer operation kind 取值。 */
export type FieldReducerOperationKindValue = ValueOf<typeof FieldReducerOperationKind>;

/** 内置 row selector operation kind 取值。 */
export type SelectorOperationKindValue = ValueOf<typeof SelectorOperationKind>;

/** 按数值字段取极值的 row selector operation kind 取值。 */
export type MinMaxSelectorOperationKindValue = ValueOf<typeof MinMaxSelectorOperationKind>;

/** 按现有顺序或显式排序取行的 row selector operation kind 取值。 */
export type FirstLastSelectorOperationKindValue = ValueOf<typeof FirstLastSelectorOperationKind>;

/** 按排序名次取行的 row selector operation kind 取值。 */
export type TopBottomSelectorOperationKindValue = ValueOf<typeof TopBottomSelectorOperationKind>;

/** row selector 平局处理策略值。 */
export type RowSelectorTieValue = ValueOf<typeof RowSelectorTie>;

/** 排序变换（稳定排序，保行数）。 */
export type IRDataSortTransform = z.infer<typeof SortTransformSchema>;

/** reducer operation（统计规约子算子）。 */
export type IRDataReducerOperation = z.infer<typeof ReducerOperationSchema>;

/** reducer metrics 列表。 */
export type IRDataReducerMetrics = z.infer<typeof ReducerMetricsSchema>;

/** quantile-band reducer operation（参数化分位区间规约）。 */
export type IRDataQuantileBandReducerOperation = z.infer<typeof QuantileBandReducerOperationSchema>;

/** row selector operation（代表行选择子算子）。 */
export type IRDataSelectorOperation = z.infer<typeof SelectorOperationSchema>;

/** outside-quantile-band selector operation（分位区间外原始行选择）。 */
export type IRDataOutsideQuantileBandSelectorOperation = z.infer<typeof OutsideQuantileBandSelectorOperationSchema>;

/** selector 排序规则（代表行选择前的稳定排序规则）。 */
export type IRDataOrderBy = z.infer<typeof OrderBySchema>;

/** 汇总变换（分组统计，改行数）。 */
export type IRDataSummarizeTransform = z.infer<typeof SummarizeTransformSchema>;

/** 选择变换（选择代表原始行，可能改行数）。 */
export type IRDataSelectTransform = z.infer<typeof SelectTransformSchema>;

/** annotate 单行 selector 配置（至多一个代表行的回填规则）。 */
export type IRDataAnnotateSelector = z.infer<typeof AnnotateSelectorSchema>;

/** 标注变换（统计回填，保行数）。 */
export type IRDataAnnotateTransform = z.infer<typeof AnnotateTransformSchema>;

/** 内置 transform operation（sort / summarize / select / annotate）。 */
export type IRDataBuiltinTransform = z.infer<typeof BuiltinTransformSchema>;

/** transform operation（内置 ∪ 外部注册 kind 开放配置）。 */
export type IRDataTransform = z.infer<typeof TransformSchema>;
