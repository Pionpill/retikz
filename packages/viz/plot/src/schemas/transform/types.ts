import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type {
  DensityBandwidthKind,
  JitterAxis,
  NormalizeBasis,
  PairMeasureOperationKind,
  PlotTransform,
  SmoothMethodKind,
  StackOffset,
} from './constants';
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

/** plot-only transform 类型 */
export type PlotTransformValue = ValueOf<typeof PlotTransform>;

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

/** smooth 方法类型取值 */
export type SmoothMethodKindValue = ValueOf<typeof SmoothMethodKind>;

/** 堆叠变换（跨行累积区间，保行数） */
export type IRPlotStackTransform = z.infer<typeof StackTransformSchema>;

/** 分箱变换（连续分箱，改行数） */
export type IRPlotBinTransform = z.infer<typeof BinTransformSchema>;

/** 归一化变换（组内百分比归一化，保行数） */
export type IRPlotNormalizeTransform = z.infer<typeof NormalizeTransformSchema>;

/** 区间派生变换（单行派生区间，保行数） */
export type IRPlotDeriveIntervalTransform = z.infer<typeof DeriveIntervalTransformSchema>;

/** relate 端点投影（每组选择 source / target 行并映射字段） */
export type IRPlotEndpointProjection = z.infer<typeof EndpointProjectionSchema>;

/** 配对度量（从 source / target 行派生差值等字段） */
export type IRPlotPairMeasureOperation = z.infer<typeof PairMeasureOperationSchema>;

/** 关系变换（从数据动态派生 relation rows） */
export type IRPlotRelateTransform = z.infer<typeof RelateTransformSchema>;

/** 抖点变换（确定性位置抖动，保行数） */
export type IRPlotJitterTransform = z.infer<typeof JitterTransformSchema>;

/** density 带宽策略（Silverman 默认或显式正数带宽） */
export type IRPlotDensityBandwidthSpec = z.infer<typeof DensityBandwidthSpecSchema>;

/** density 变换（一维 KDE 采样，改行数） */
export type IRPlotDensityTransform = z.infer<typeof DensityTransformSchema>;

/** smooth 方法策略（首轮为线性回归） */
export type IRPlotSmoothMethodSpec = z.infer<typeof SmoothMethodSpecSchema>;

/** smooth 变换（线性趋势线采样，改行数） */
export type IRPlotSmoothTransform = z.infer<typeof SmoothTransformSchema>;

/** plot-only 内置 transform operation */
export type IRPlotBuiltinTransform = z.infer<typeof PlotBuiltinTransformSchema>;

/** plot transform operation（data 内置 ∪ plot 内置 ∪ 外部注册 kind 开放配置） */
export type IRPlotTransform = z.infer<typeof TransformSchema>;
