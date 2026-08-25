import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type {
  CompositionAxisResolve,
  CompositionGridResolve,
  CompositionScaleResolve,
  CoordinateArrangementKind,
  CoordinateViewPlacementKind,
  FacetEmptyPolicy,
  FacetScaleSharing,
  PlotComposite,
  ScaffoldFrameMode,
} from './constants';
import type { PlotPartitionDimensionSchema, PlotPartitionScalarSchema } from './partition';
import type { PlotFacetConfigurationSchema, PlotFacetOptionsSchema, PlotSchema } from './schema';

/** plot composite 类型 */
export type PlotCompositeValue = ValueOf<typeof PlotComposite>;

/** 分面空面板生成策略取值 */
export type FacetEmptyPolicyValue = ValueOf<typeof FacetEmptyPolicy>;

/** 分面 scale domain 共享模式取值 */
export type FacetScaleSharingValue = ValueOf<typeof FacetScaleSharing>;

/** 坐标组合中的比例尺解析模式取值 */
export type CompositionScaleResolveValue = ValueOf<typeof CompositionScaleResolve>;

/** 坐标组合中的坐标轴输出模式取值 */
export type CompositionAxisResolveValue = ValueOf<typeof CompositionAxisResolve>;

/** 坐标组合中的网格投放模式取值 */
export type CompositionGridResolveValue = ValueOf<typeof CompositionGridResolve>;

/** 坐标视图放置方式取值 */
export type CoordinateViewPlacementKindValue = ValueOf<typeof CoordinateViewPlacementKind>;

/** 坐标组合结构类型取值 */
export type CoordinateArrangementKindValue = ValueOf<typeof CoordinateArrangementKind>;

/** 轨道组合结构的 frame 共享模式取值 */
export type ScaffoldFrameModeValue = ValueOf<typeof ScaffoldFrameMode>;

/** Plot IR 根节点（plot composite 节点） */
export type IRPlot = ZodInfer<typeof PlotSchema>;

/** Plot 与高层图表共同复用的 JSON-safe facet 作者配置 */
export type IRPlotFacetConfiguration = ZodInfer<typeof PlotFacetConfigurationSchema>;

/** facet使用的有限JSON partition scalar */
export type PlotPartitionScalar = ZodInfer<typeof PlotPartitionScalarSchema>;

/** Plot partition字段、顺序与label声明 */
export type IRPlotPartitionDimension = ZodInfer<typeof PlotPartitionDimensionSchema>;

/** 不含identity与dimension的facet选项 */
export type IRPlotFacetOptions = ZodInfer<typeof PlotFacetOptionsSchema>;
