import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type {
  DensityBandwidthKind,
  JitterAxis,
  NormalizeBasis,
  PairMeasureOperationKind,
  StackOffset,
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
import type {
  DataScalarReducerOperationSchema,
  QuantileBandReducerOperationSchema,
  ReducerMetricsSchema,
  ReducerOperationSchema,
} from './reducer';
import type {
  BinTransformSchema,
  DensityBandwidthSchema,
  DensityTransformSchema,
  DeriveIntervalTransformSchema,
  EndpointProjectionSchema,
  JitterTransformSchema,
  NormalizeTransformSchema,
  PairMeasureOperationSchema,
  RelateTransformSchema,
  SmoothTransformSchema,
  StackTransformSchema,
  AnnotateSelectorSchema,
  AnnotateTransformSchema,
  BuiltinTransformSchema,
  SelectTransformSchema,
  SortTransformSchema,
  SummarizeTransformSchema,
  TransformSchema,
} from './schema';
import type { OrderBySchema, OutsideQuantileBandSelectorOperationSchema, SelectorOperationSchema } from './selector';
/** transform operation kind 取值 */
export type DataTransformValue = ValueOf<typeof DataTransform>;

/** data 排序方向取值 */
export type DataSortOrderValue = ValueOf<typeof DataSortOrder>;

/** 内置统计 reducer operation kind 取值 */
export type ReducerOperationKindValue = ValueOf<typeof ReducerOperationKind>;

/** 读取 numeric field 的内置统计 reducer operation kind 取值 */
export type FieldReducerOperationKindValue = ValueOf<typeof FieldReducerOperationKind>;

/** 内置 row selector operation kind 取值 */
export type SelectorOperationKindValue = ValueOf<typeof SelectorOperationKind>;

/** 按数值字段取极值的 row selector operation kind 取值 */
export type MinMaxSelectorOperationKindValue = ValueOf<typeof MinMaxSelectorOperationKind>;

/** 按现有顺序或显式排序取行的 row selector operation kind 取值 */
export type FirstLastSelectorOperationKindValue = ValueOf<typeof FirstLastSelectorOperationKind>;

/** 按排序名次取行的 row selector operation kind 取值 */
export type TopBottomSelectorOperationKindValue = ValueOf<typeof TopBottomSelectorOperationKind>;

/** row selector 平局处理策略值 */
export type RowSelectorTieValue = ValueOf<typeof RowSelectorTie>;

/** 排序变换（稳定排序，保行数） */
export type IRDataSortTransform = ZodInfer<typeof SortTransformSchema>;

/** reducer operation（统计规约子算子） */
export type IRDataReducerOperation = ZodInfer<typeof ReducerOperationSchema>;

/** compact aggregate Source parse态候选；运行时仍需Definition确认单scalar capability */
export type IRDataScalarReducerOperation = ZodInfer<typeof DataScalarReducerOperationSchema>;

/** reducer metrics 列表 */
export type IRDataReducerMetrics = ZodInfer<typeof ReducerMetricsSchema>;

/** quantile-band reducer operation（参数化分位区间规约） */
export type IRDataQuantileBandReducerOperation = ZodInfer<typeof QuantileBandReducerOperationSchema>;

/** row selector operation（代表行选择子算子） */
export type IRDataSelectorOperation = ZodInfer<typeof SelectorOperationSchema>;

/** outside-quantile-band selector operation（分位区间外原始行选择） */
export type IRDataOutsideQuantileBandSelectorOperation = ZodInfer<typeof OutsideQuantileBandSelectorOperationSchema>;

/** selector 排序规则（代表行选择前的稳定排序规则） */
export type IRDataOrderBy = ZodInfer<typeof OrderBySchema>;

/** 汇总变换（分组统计，改行数） */
export type IRDataSummarizeTransform = ZodInfer<typeof SummarizeTransformSchema>;

/** 选择变换（选择代表原始行，可能改行数） */
export type IRDataSelectTransform = ZodInfer<typeof SelectTransformSchema>;

/** annotate 单行 selector 配置（至多一个代表行的回填规则） */
export type IRDataAnnotateSelector = ZodInfer<typeof AnnotateSelectorSchema>;

/** 标注变换（统计回填，保行数） */
export type IRDataAnnotateTransform = ZodInfer<typeof AnnotateTransformSchema>;

/** 内置 transform operation（排序、汇总、选行、标注、堆叠、分箱、归一化、区间派生、关系、抖动、密度与拟合） */
export type IRDataBuiltinTransform = ZodInfer<typeof BuiltinTransformSchema>;

/** transform operation（内置 ∪ 外部注册 kind 开放配置） */
export type IRDataTransform = ZodInfer<typeof TransformSchema>;

/** stack baseline offset 策略值 */
export type StackOffsetValue = ValueOf<typeof StackOffset>;

/** 配对度量操作类型取值 */
export type PairMeasureOperationKindValue = ValueOf<typeof PairMeasureOperationKind>;

/** 归一化结果的数值基准取值 */
export type NormalizeBasisValue = ValueOf<typeof NormalizeBasis>;

/** jitter 作用轴取值 */
export type JitterAxisValue = ValueOf<typeof JitterAxis>;

/** density 带宽策略类型取值 */
export type DensityBandwidthKindValue = ValueOf<typeof DensityBandwidthKind>;

/** 堆叠变换（跨行累积区间，保行数） */
export type IRDataStackTransform = ZodInfer<typeof StackTransformSchema>;

/** 分箱变换（连续分箱，改行数） */
export type IRDataBinTransform = ZodInfer<typeof BinTransformSchema>;

/** 归一化变换（组内百分比归一化，保行数） */
export type IRDataNormalizeTransform = ZodInfer<typeof NormalizeTransformSchema>;

/** 区间派生变换（单行派生区间，保行数） */
export type IRDataDeriveIntervalTransform = ZodInfer<typeof DeriveIntervalTransformSchema>;

/** relate 端点投影（每组选择 source / target 行并映射字段） */
export type IRDataEndpointProjection = ZodInfer<typeof EndpointProjectionSchema>;

/** 配对度量（从 source / target 行派生差值等字段） */
export type IRDataPairMeasureOperation = ZodInfer<typeof PairMeasureOperationSchema>;

/** 关系变换（从数据动态派生 relation rows） */
export type IRDataRelateTransform = ZodInfer<typeof RelateTransformSchema>;

/** 抖点变换（确定性位置抖动，保行数） */
export type IRDataJitterTransform = ZodInfer<typeof JitterTransformSchema>;

/** density 带宽策略（Silverman 默认或显式正数带宽） */
export type IRDataDensityBandwidth = ZodInfer<typeof DensityBandwidthSchema>;

/** density 变换（一维 KDE 采样，改行数） */
export type IRDataDensityTransform = ZodInfer<typeof DensityTransformSchema>;

/** smooth 变换（回归趋势线采样，改行数） */
export type IRDataSmoothTransform = ZodInfer<typeof SmoothTransformSchema>;
