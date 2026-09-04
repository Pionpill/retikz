import type { IRBoxSpacing } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type {
  IntervalBoundKind,
  MarkValueKind,
  PathClosureKind,
  PathCurve,
  PlotMark,
  ReferenceMarkKind,
  RelationGeometryKind,
  RelationOrthogonalLabelStep,
  RelationRouteStepKind,
  RelationRoutingKind,
} from './constants';
import type {
  AnchorIdSchema,
  BlendModeStyleSchema,
  CustomMarkSchema,
  IntervalBoundSchema,
  IntervalBoundsSchema,
  IntervalMarkSchema,
  MarkOperationSchema,
  MarkSchema,
  MarkTransformSchema,
  NodeAxisScaleStyleSchema,
  NodeBooleanStyleSchema,
  NodeBoundaryStyleSchema,
  NodeBoxSizeStyleSchema,
  NodeBoxSpacingStyleSchema,
  NodeDashPatternStyleSchema,
  NodeFontStyleSchema,
  NodePositiveNumberStyleSchema,
  NodeTextAlignStyleSchema,
  PathClosureSchema,
  PathFillRuleStyleSchema,
  PathMarkSchema,
  PathScaleStyleSchema,
  PathThicknessStyleSchema,
  PlotTargetRefSchema,
  PointColorStyleSchema,
  PointFillStyleSchema,
  PointMarkSchema,
  PointNonnegativeNumberStyleSchema,
  PointNumberStyleSchema,
  PointOpacityStyleSchema,
  PointShapeStyleSchema,
  PointSizeStyleSchema,
  PointStrokeStyleSchema,
  PointZIndexStyleSchema,
  ReferenceMarkSchema,
  RelationEndpointGlyphSchema,
  RelationEndpointGlyphsSchema,
  RelationMarkSchema,
  RelationPathGeometrySchema,
  RelationPathSpecificOptionsSchema,
  RelationPrimitiveStyleSchema,
  RelationRibbonOptionsSchema,
  RelationRibbonSpecificOptionsSchema,
  RelationRouteStepSchema,
  RelationRoutingSchema,
  RelationStepLabelSchema,
  RelationTransformSchema,
  ShadowStyleSchema,
} from './schema';

import { BUILTIN_MARK_TYPES } from './constants';

export type { IRBoxSpacing };

/** mark 类型 */
export type PlotMarkValue = ValueOf<typeof PlotMark>;

/** point mark（散点 + 文本标签） */
export type IRPlotPointMark = ZodInfer<typeof PointMarkSchema>;

/** mark 值来源变体 */
export type MarkValueKindValue = ValueOf<typeof MarkValueKind>;

/** PointMark 颜色样式值（field / constant） */
export type IRPlotPointColorStyle = ZodInfer<typeof PointColorStyleSchema>;

/** PointMark 尺寸样式值（field / constant） */
export type IRPlotPointSizeStyle = ZodInfer<typeof PointSizeStyleSchema>;

/** PointMark 形状样式值（field / constant） */
export type IRPlotPointShapeStyle = ZodInfer<typeof PointShapeStyleSchema>;

/** PointMark 填充样式值（field / constant） */
export type IRPlotPointFillStyle = ZodInfer<typeof PointFillStyleSchema>;

/** PointMark 描边颜色样式值（field / constant） */
export type IRPlotPointStrokeStyle = ZodInfer<typeof PointStrokeStyleSchema>;

/** PointMark 描边宽度样式值（field / constant） */
export type IRPlotPointStrokeWidthStyle = ZodInfer<typeof PointNonnegativeNumberStyleSchema>;

/** PointMark 数值样式值（field / constant） */
export type IRPlotPointNumberStyle = ZodInfer<typeof PointNumberStyleSchema>;

/** PointMark 非负数值样式值（field / constant） */
export type IRPlotPointNonnegativeNumberStyle = ZodInfer<typeof PointNonnegativeNumberStyleSchema>;

/** PointMark 透明度样式值（field / constant） */
export type IRPlotPointOpacityStyle = ZodInfer<typeof PointOpacityStyleSchema>;

/** PointMark zIndex 样式值（field / constant） */
export type IRPlotPointZIndexStyle = ZodInfer<typeof PointZIndexStyleSchema>;

/** NodeMark 正数样式值（field / constant） */
export type IRPlotNodePositiveNumberStyle = ZodInfer<typeof NodePositiveNumberStyleSchema>;

/** NodeMark 文本对齐样式值（field / constant） */
export type IRPlotNodeTextAlignStyle = ZodInfer<typeof NodeTextAlignStyleSchema>;

/** NodeMark 布尔样式值（field / constant） */
export type IRPlotNodeBooleanStyle = ZodInfer<typeof NodeBooleanStyleSchema>;

/** NodeMark 虚线样式值（field / constant） */
export type IRPlotNodeDashPatternStyle = ZodInfer<typeof NodeDashPatternStyleSchema>;

/** NodeMark 字体样式值（field / constant） */
export type IRPlotNodeFontStyle = ZodInfer<typeof NodeFontStyleSchema>;

/** NodeMark 边界样式值（field / constant） */
export type IRPlotNodeBoundaryStyle = ZodInfer<typeof NodeBoundaryStyleSchema>;

/** NodeMark 盒模型间距样式值（field / constant） */
export type IRPlotNodeBoxSpacingStyle = ZodInfer<typeof NodeBoxSpacingStyleSchema>;

/** NodeMark 轴向 scale 样式值（field / constant） */
export type IRPlotNodeAxisScaleStyle = ZodInfer<typeof NodeAxisScaleStyleSchema>;

/** NodeMark 盒尺寸样式值（field / constant） */
export type IRPlotNodeBoxSizeStyle = ZodInfer<typeof NodeBoxSizeStyleSchema>;

/** 阴影样式声明 */
export type IRPlotShadowStyle = ZodInfer<typeof ShadowStyleSchema>;

/** 混合模式样式声明 */
export type IRPlotBlendModeStyle = ZodInfer<typeof BlendModeStyleSchema>;

/** PathMark 填充规则样式值 */
export type IRPlotPathFillRuleStyle = ZodInfer<typeof PathFillRuleStyleSchema>;

/** PathMark 线宽样式值 */
export type IRPlotPathThicknessStyle = ZodInfer<typeof PathThicknessStyleSchema>;

/** PathMark scale 绑定样式值 */
export type IRPlotPathScaleStyle = ZodInfer<typeof PathScaleStyleSchema>;

/** PathMark 相邻点连接方式 */
export type PathCurveValue = ValueOf<typeof PathCurve>;

/** PathMark 闭合策略 */
export type PathClosureKindValue = ValueOf<typeof PathClosureKind>;

/** PathMark 闭合策略配置 */
export type IRPlotPathClosure = ZodInfer<typeof PathClosureSchema>;

/** path mark（折线 / 轮廓） */
export type IRPlotPathMark = ZodInfer<typeof PathMarkSchema>;

/** interval 单维区间来源 */
export type IntervalBoundKindValue = ValueOf<typeof IntervalBoundKind>;

/** interval 单维区间来源 */
export type IRPlotIntervalBound = ZodInfer<typeof IntervalBoundSchema>;

/** interval per-role 区间来源 */
export type IRPlotIntervalBounds = ZodInfer<typeof IntervalBoundsSchema>;

/** interval mark（柱 / histogram / heatmap / 径向柱 / 饼环） */
export type IRPlotIntervalMark = ZodInfer<typeof IntervalMarkSchema>;

/** reference mark（参考线 / 阈值线 / 容差带） */
export type IRPlotReferenceMark = ZodInfer<typeof ReferenceMarkSchema>;

/** mark 锚点 id 声明 */
export type IRPlotAnchorId = ZodInfer<typeof AnchorIdSchema>;

/** plot 内目标引用，可指向数据行、系列或锚点 */
export type IRPlotTargetRef = ZodInfer<typeof PlotTargetRefSchema>;

/** relation 路由步骤标签声明 */
export type IRPlotRelationStepLabel = ZodInfer<typeof RelationStepLabelSchema>;

/** relation 路由中的单步声明 */
export type IRPlotRelationRouteStep = ZodInfer<typeof RelationRouteStepSchema>;

/** mark 局部数据变换声明 */
export type IRPlotMarkTransform = ZodInfer<typeof MarkTransformSchema>;

/** relation mark 的数据派生变换声明 */
export type IRPlotRelationTransform = ZodInfer<typeof RelationTransformSchema>;

/** RelationMark 几何子类型值 */
export type RelationGeometryKindValue = ValueOf<typeof RelationGeometryKind>;

/** relation 显式路由支持的 core step 类型取值 */
export type RelationRouteStepKindValue = ValueOf<typeof RelationRouteStepKind>;

/** relation 自动路由策略类型取值 */
export type RelationRoutingKindValue = ValueOf<typeof RelationRoutingKind>;

/** relation 正交路由标签落点策略取值 */
export type RelationOrthogonalLabelStepValue = ValueOf<typeof RelationOrthogonalLabelStep>;

/** reference mark 显式形态取值 */
export type ReferenceMarkKindValue = ValueOf<typeof ReferenceMarkKind>;

/** relation mark 的路由策略声明 */
export type IRPlotRelationRouting = ZodInfer<typeof RelationRoutingSchema>;

/** relation primitive 的公共样式声明 */
export type IRPlotRelationPrimitiveStyle = ZodInfer<typeof RelationPrimitiveStyleSchema>;

/** Relation projected target 的端点 glyph 表现 */
export type IRPlotRelationEndpointGlyph = ZodInfer<typeof RelationEndpointGlyphSchema>;

/** Relation source / target 端点 glyph 配置 */
export type IRPlotRelationEndpointGlyphs = ZodInfer<typeof RelationEndpointGlyphsSchema>;

/** relation path 专属选项声明 */
export type IRPlotRelationPathSpecificOptions = ZodInfer<typeof RelationPathSpecificOptionsSchema>;

/** relation path 几何声明 */
export type IRPlotRelationPathGeometry = ZodInfer<typeof RelationPathGeometrySchema>;

/** relation ribbon 专属选项声明 */
export type IRPlotRelationRibbonSpecificOptions = ZodInfer<typeof RelationRibbonSpecificOptionsSchema>;

/** relation ribbon 几何选项声明 */
export type IRPlotRelationRibbonOptions = ZodInfer<typeof RelationRibbonOptionsSchema>;

/** relation mark 声明 */
export type IRPlotRelationMark = ZodInfer<typeof RelationMarkSchema>;

/** 内置 mark 声明 */
export type IRPlotMark = ZodInfer<typeof MarkSchema>;

/** custom mark operation（自定义 type 开放配置，由 runtime MarkDefinition 解释） */
export type IRPlotCustomMark = ZodInfer<typeof CustomMarkSchema>;

/** mark operation（内置 ∪ 自定义 type 开放配置） */
export type IRPlotMarkOperation = ZodInfer<typeof MarkOperationSchema>;

/** mark operation 是否内置；把放宽后的 union 收窄回精确内置 Mark，供 lowering 内置专属几何分支门控 */
export const isBuiltinMark = (mark: IRPlotMarkOperation): mark is IRPlotMark => BUILTIN_MARK_TYPES.has(mark.type);
