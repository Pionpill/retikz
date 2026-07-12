import type { IRBoxSpacing, IRStepLabelInput, ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  IntervalBoundKind,
  MarkValueKind,
  PathClosureKind,
  PathCurve,
  PlotMark,
  RelationGeometryKind,
} from './constants';
import type {
  AnchorIdSpecSchema,
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
  RelationMarkSchema,
  RelationPathGeometrySchema,
  RelationPathSpecificOptionsSchema,
  RelationPrimitiveStyleSchema,
  RelationRibbonOptionsSchema,
  RelationRibbonSpecificOptionsSchema,
  RelationRouteStepSchema,
  RelationRoutingSpecSchema,
  RelationStepLabelSchema,
  RelationTransformSchema,
  ShadowStyleSchema,
} from './schema';

import { BUILTIN_MARK_TYPES } from './constants';

export type { IRBoxSpacing };

/** mark 类型 */
export type PlotMarkValue = ValueOf<typeof PlotMark>;

/** point mark（散点 + 文本标签） */
export type PointMark = z.infer<typeof PointMarkSchema>;

/** mark 值来源变体 */
export type MarkValueKindValue = ValueOf<typeof MarkValueKind>;

/** mark 样式值；需要 scale 的属性在此基础上交叉 `{ scale?: string }` */
export type MarkValueType<T> = { kind: 'field'; value: string } | { kind: 'constant'; value: T };

/** mark 样式值，字段变体可绑定 scale */
export type ScaledMarkValueType<T> = MarkValueType<T> & { scale?: string };

/** PointMark 颜色样式值（field / constant） */
export type PointColorStyle = z.infer<typeof PointColorStyleSchema>;

/** PointMark 尺寸样式值（field / constant） */
export type PointSizeStyle = z.infer<typeof PointSizeStyleSchema>;

/** PointMark 形状样式值（field / constant） */
export type PointShapeStyle = z.infer<typeof PointShapeStyleSchema>;

/** PointMark 填充样式值（field / constant） */
export type PointFillStyle = z.infer<typeof PointFillStyleSchema>;

/** PointMark 描边颜色样式值（field / constant） */
export type PointStrokeStyle = z.infer<typeof PointStrokeStyleSchema>;

/** PointMark 描边宽度样式值（field / constant） */
export type PointStrokeWidthStyle = z.infer<typeof PointNonnegativeNumberStyleSchema>;

/** PointMark 数值样式值（field / constant） */
export type PointNumberStyle = z.infer<typeof PointNumberStyleSchema>;

/** PointMark 非负数值样式值（field / constant） */
export type PointNonnegativeNumberStyle = z.infer<typeof PointNonnegativeNumberStyleSchema>;

/** PointMark 透明度样式值（field / constant） */
export type PointOpacityStyle = z.infer<typeof PointOpacityStyleSchema>;

/** PointMark zIndex 样式值（field / constant） */
export type PointZIndexStyle = z.infer<typeof PointZIndexStyleSchema>;

/** NodeMark 正数样式值（field / constant）。 */
export type NodePositiveNumberStyle = z.infer<typeof NodePositiveNumberStyleSchema>;

/** NodeMark 文本对齐样式值（field / constant）。 */
export type NodeTextAlignStyle = z.infer<typeof NodeTextAlignStyleSchema>;

/** NodeMark 布尔样式值（field / constant）。 */
export type NodeBooleanStyle = z.infer<typeof NodeBooleanStyleSchema>;

/** NodeMark 虚线样式值（field / constant）。 */
export type NodeDashPatternStyle = z.infer<typeof NodeDashPatternStyleSchema>;

/** NodeMark 字体样式值（field / constant）。 */
export type NodeFontStyle = z.infer<typeof NodeFontStyleSchema>;

/** NodeMark 边界样式值（field / constant）。 */
export type NodeBoundaryStyle = z.infer<typeof NodeBoundaryStyleSchema>;

/** NodeMark 盒模型间距样式值（field / constant）。 */
export type NodeBoxSpacingStyle = z.infer<typeof NodeBoxSpacingStyleSchema>;

/** NodeMark 轴向 scale 样式值（field / constant）。 */
export type NodeAxisScaleStyle = z.infer<typeof NodeAxisScaleStyleSchema>;

/** NodeMark 盒尺寸样式值（field / constant）。 */
export type NodeBoxSizeStyle = z.infer<typeof NodeBoxSizeStyleSchema>;

/** 阴影样式声明。 */
export type ShadowStyle = z.infer<typeof ShadowStyleSchema>;

/** 混合模式样式声明。 */
export type BlendModeStyle = z.infer<typeof BlendModeStyleSchema>;

/** PathMark 填充规则样式值。 */
export type PathFillRuleStyle = z.infer<typeof PathFillRuleStyleSchema>;

/** PathMark 线宽样式值。 */
export type PathThicknessStyle = z.infer<typeof PathThicknessStyleSchema>;

/** PathMark scale 绑定样式值。 */
export type PathScaleStyle = z.infer<typeof PathScaleStyleSchema>;

/** PathMark 相邻点连接方式。 */
export type PathCurveValue = ValueOf<typeof PathCurve>;

/** PathMark 闭合策略 */
export type PathClosureKindValue = ValueOf<typeof PathClosureKind>;

/** PathMark 闭合策略配置。 */
export type PathClosure = z.infer<typeof PathClosureSchema>;

/** path mark（折线 / 轮廓） */
export type PathMark = z.infer<typeof PathMarkSchema>;

/** interval 单维区间来源 */
export type IntervalBoundKindValue = ValueOf<typeof IntervalBoundKind>;

/** interval 单维区间来源 */
export type IntervalBound = z.infer<typeof IntervalBoundSchema>;

/** interval per-role 区间来源 */
export type IntervalBounds = z.infer<typeof IntervalBoundsSchema>;

/** interval mark（柱 / histogram / heatmap / 径向柱 / 饼环） */
export type IntervalMark = z.infer<typeof IntervalMarkSchema>;

/** reference mark（参考线 / 阈值线 / 容差带） */
export type ReferenceMark = z.infer<typeof ReferenceMarkSchema>;

/** mark 锚点 id 声明。 */
export type AnchorIdSpec = z.infer<typeof AnchorIdSpecSchema>;

/** plot 内目标引用，可指向数据行、系列或锚点。 */
export type PlotTargetRef = z.infer<typeof PlotTargetRefSchema>;

/** relation 路由步骤标签声明。 */
export type RelationStepLabel = z.infer<typeof RelationStepLabelSchema>;

/** relation 路由步骤标签输入，沿用 core step label 并替换文本字段。 */
export type RelationStepLabelInput = Omit<IRStepLabelInput, 'text'> & {
  text: RelationStepLabel['text'];
};

/** relation 路由中的单步声明。 */
export type RelationRouteStep = z.infer<typeof RelationRouteStepSchema>;

/** relation 路由单步输入，允许使用 adapter 侧标签输入。 */
export type RelationRouteStepInput = Omit<RelationRouteStep, 'label'> & {
  label?: RelationStepLabelInput;
};

/** mark 局部数据变换声明。 */
export type MarkTransform = z.infer<typeof MarkTransformSchema>;

/** relation mark 的数据派生变换声明。 */
export type RelationTransform = z.infer<typeof RelationTransformSchema>;

/** RelationMark 几何子类型值 */
export type RelationGeometryKindValue = ValueOf<typeof RelationGeometryKind>;

/** relation mark 的路由策略声明。 */
export type RelationRoutingSpec = z.infer<typeof RelationRoutingSpecSchema>;

/** relation primitive 的公共样式声明。 */
export type RelationPrimitiveStyle = z.infer<typeof RelationPrimitiveStyleSchema>;

/** relation path 专属选项声明。 */
export type RelationPathSpecificOptions = z.infer<typeof RelationPathSpecificOptionsSchema>;

/** relation path 几何声明。 */
export type RelationPathGeometry = z.infer<typeof RelationPathGeometrySchema>;

/** relation path 几何输入，允许 adapter 侧标签和路由输入。 */
export type RelationPathGeometryInput = Omit<RelationPathGeometry, 'label' | 'route'> & {
  label?: RelationStepLabelInput;
  route?: Array<RelationRouteStepInput>;
};

/** relation ribbon 专属选项声明。 */
export type RelationRibbonSpecificOptions = z.infer<typeof RelationRibbonSpecificOptionsSchema>;

/** relation ribbon 几何选项声明。 */
export type RelationRibbonOptions = z.infer<typeof RelationRibbonOptionsSchema>;

/** relation mark 声明。 */
export type RelationMark = z.infer<typeof RelationMarkSchema>;

/** 内置 mark 声明。 */
export type Mark = z.infer<typeof MarkSchema>;

/** custom mark operation（自定义 type 开放配置，由 runtime MarkDefinition 解释） */
export type CustomMark = z.infer<typeof CustomMarkSchema>;

/** mark operation（内置 ∪ 自定义 type 开放配置） */
export type MarkOperation = z.infer<typeof MarkOperationSchema>;

/** mark operation 是否内置；把放宽后的 union 收窄回精确内置 Mark，供 lowering 内置专属几何分支门控。 */
export const isBuiltinMark = (mark: MarkOperation): mark is Mark => BUILTIN_MARK_TYPES.has(mark.type);
