import type { z } from 'zod';

import type {
  BinTransformSchema,
  DensityBandwidthSpecSchema,
  DensityTransformSchema,
  DeriveIntervalTransformSchema,
  EndpointProjectionSchema,
  JitterTransformSchema,
  NormalizeTransformSchema,
  PairMeasureOperationSchema,
  PlotBuiltinTransformSchema,
  RelateTransformSchema,
  SmoothMethodSpecSchema,
  SmoothTransformSchema,
  StackTransformSchema,
  TransformSchema,
} from './schema';

/** 堆叠变换（跨行累积区间，保行数）。 */
export type StackTransform = z.infer<typeof StackTransformSchema>;

/** 分箱变换（连续分箱，改行数）。 */
export type BinTransform = z.infer<typeof BinTransformSchema>;

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

/** plot-only 内置 transform operation。 */
export type PlotBuiltinTransform = z.infer<typeof PlotBuiltinTransformSchema>;

/** plot transform operation（data 内置 ∪ plot 内置 ∪ 外部注册 kind 开放配置）。 */
export type Transform = z.infer<typeof TransformSchema>;

/** plot transform 管线 operation；定义对象在运行时用 schema 精确收窄。 */
export type TransformOperation = Transform;
