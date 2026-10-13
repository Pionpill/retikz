import type { infer as ZodInfer } from 'zod';

import type {
  AnnotateSelectorSchema,
  AnnotateTransformSchema,
  BinTransformSchema,
  BuiltinTransformSchema,
  DensityBandwidthSchema,
  DensityTransformSchema,
  DeriveIntervalTransformSchema,
  EndpointProjectionSchema,
  JitterTransformSchema,
  NormalizeTransformSchema,
  PairMeasureOperationSchema,
  RelateTransformSchema,
  SelectTransformSchema,
  SmoothTransformSchema,
  SortTransformSchema,
  StackTransformSchema,
  SummarizeTransformSchema,
  TransformSchema,
} from './schema';

/** 排序变换（稳定排序，保行数） */
export type IRDataSortTransform = ZodInfer<typeof SortTransformSchema>;

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
