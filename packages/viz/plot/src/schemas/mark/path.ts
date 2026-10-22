import {
  PathFillRuleSchema,
  PathLineCapSchema,
  PathLineJoinSchema,
  PathScaleSchema,
  CssColorSchema,
  OpacitySchema,
  PathDecorationSchema,
  PathStrokeSchema,
  PathTransformSchema,
} from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { boolean, discriminatedUnion, enum as zodEnum, literal, never, number, strictObject, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { CoordinateConnection, PolarInterpolation } from '../coordinate';
import { PathEncodingSchema, PositionEncodingSchema } from '../encoding';
import { AnchorIdSchema, hasValidAnchorSource } from './anchor';
import { BuiltinPlotMark, markBase } from './base';
import { MarkPathLabelListSchema } from './label';
import {
  MarkOpacityStyleSchema,
  MarkFillStyleSchema,
  MarkStrokeStyleSchema,
  MarkZIndexStyleSchema,
  MarkNumberStyleSchema,
  MarkDashPatternStyleSchema,
  MarkShadowStyleSchema,
  MarkBlendModeStyleSchema,
  MarkNonnegativeNumberStyleSchema,
} from './style';

/** 校验路径线帽的固定形状 */
export const PathLineCapStyleSchema = PathLineCapSchema.describe('path lineCap style value');

/** 校验路径拐角连接的固定形状 */
export const PathLineJoinStyleSchema = PathLineJoinSchema.describe('path lineJoin style value');

/** 校验路径圆角的固定非负半径 */
export const PathRoundedCornersStyleSchema = NonNegativeNumberSchema.describe('path roundedCorners style value');

/** 校验路径填充规则的固定环绕规则 */
export const PathFillRuleStyleSchema = PathFillRuleSchema.describe('path fillRule style value');

/** 校验路径缩放的固定统一与双轴倍率 */
export const PathScaleStyleSchema = PathScaleSchema.describe('path scale style value');

/** 路径宿主复用的固定样式字段 */
const corePathStyle = {
  fill: MarkFillStyleSchema.optional().describe('Core Path fill paint: fixed CSS color / IRPaint'),
  stroke: MarkStrokeStyleSchema.optional().describe('Core Path stroke paint: fixed CSS color / IRPaint'),
  zIndex: MarkZIndexStyleSchema.optional().describe('Core Path zIndex: fixed integer'),
  rotate: MarkNumberStyleSchema.optional().describe('Core Path rotate: fixed angle'),
  scale: PathScaleStyleSchema.optional().describe('Core Path scale: fixed number / {x,y}'),
  fillRule: PathFillRuleStyleSchema.optional().describe('Core Path fillRule: fixed nonzero / evenodd'),
  marks: PathDecorationSchema.shape.marks
    .optional()
    .describe('Static core Path marks placed along the lowered path; use endpoint marks for arrows'),
  dashPattern: MarkDashPatternStyleSchema.optional().describe('Core Path dashPattern: fixed number array'),
  shadow: MarkShadowStyleSchema.optional().describe('Core Path shadow: fixed preset / object'),
  blendMode: MarkBlendModeStyleSchema.optional().describe('Core Path blendMode: fixed blend mode'),
};

/** 开放轨迹跨缺值连接段的常量描边覆盖 */
export const PlotPathConnectNullsStyleSchema = PathStrokeSchema.extend({
  stroke: CssColorSchema.optional(),
  strokeOpacity: OpacitySchema.optional(),
  dashPattern: PathStrokeSchema.shape.dashPattern.unwrap().default([6, 4]).optional(),
}).describe('Stroke overrides for bridges across missing projected points in an open unfilled path');

/**
 * PathMark 相邻点连接方式
 * @description 面向图表层的曲线类型；底层会下沉为 core Path 的 line / cubic / smooth steps
 */
export const PathCurve = {
  /** 折线连接：每相邻两点用直线段连接 */
  Linear: 'linear',
  /** 阶梯线：水平段在相邻点中间切换 */
  Step: 'step',
  /** 前置阶梯：先切换到下一个 y，再沿 x 前进 */
  StepBefore: 'stepBefore',
  /** 后置阶梯：先沿 x 前进，再切换到下一个 y */
  StepAfter: 'stepAfter',
  /** 基础 B 样条：平滑但通常不穿过每个中间点 */
  Basis: 'basis',
  /** Cardinal 样条：穿过数据点，曲率较柔和 */
  Cardinal: 'cardinal',
  /** Catmull-Rom 样条：穿过数据点，局部形状跟随相邻点 */
  CatmullRom: 'catmullRom',
  /** x 单调三次插值：适合 x 递增的趋势线，减少极值过冲 */
  MonotoneX: 'monotoneX',
  /** y 单调三次插值：适合 y 递增的轨迹，减少极值过冲 */
  MonotoneY: 'monotoneY',
  /** 自然三次样条：整体连续、端点二阶导为 0 */
  Natural: 'natural',
} as const;

/**
 * PathMark 闭合策略关键字
 * @description cycle 首尾闭合；baseline 回到常量基线；stack 回到逐行基线字段，适合堆叠面积
 */
export const PathClosureKind = {
  /** 首尾直接闭合，形成多边形 / 雷达轮廓 */
  Cycle: 'cycle',
  /** 上沿回到常量 baseline 后闭合，形成常规面积 */
  Baseline: 'baseline',
  /** 上沿回到每行 baselineField 指向的下边界后闭合，形成堆叠面积 / 区间带 */
  Stack: 'stack',
} as const;

/** PathMark 相邻点连接方式 */
export type PathCurve = ValueOf<typeof PathCurve>;

/** PathMark 闭合策略 */
export type PathClosureKind = ValueOf<typeof PathClosureKind>;

const PathCycleClosureSchema = strictObject({
  kind: literal(PathClosureKind.Cycle).describe('Cycle closure: connect the final point back to the first point'),
}).describe('Path cycle closure: closes the path as a polygon; set fill to render an area');

const PathBaselineClosureSchema = strictObject({
  kind: literal(PathClosureKind.Baseline).describe(
    'Baseline closure: return from the upper outline to a baseline value',
  ),
  baseline: number()
    .optional()
    .describe(
      'Constant baseline value for the return edge; omit to use 0 when it is inside the value-axis domain, otherwise the nearest value-axis domain edge. Finite-only to keep the IR JSON round-trippable',
    ),
}).describe('Path baseline closure: closes the upper outline down to a baseline; set fill to render an area');

const PathStackClosureSchema = strictObject({
  kind: literal(PathClosureKind.Stack).describe(
    'Stack closure: return from the upper outline to a per-row baseline field',
  ),
}).describe(
  'Path stack closure: closes the upper outline against a per-row lower-bound field; set fill to render an area',
);

/** 校验循环、基线或逐行堆叠基线闭合策略；几何闭合不自动开启填充 */
export const PathClosureSchema = discriminatedUnion('kind', [
  PathCycleClosureSchema,
  PathBaselineClosureSchema,
  PathStackClosureSchema,
]).describe(
  'Path closure strategy: cycle, baseline, or per-row stacked baseline. Providing closure makes PathMark geometrically closed; fill still controls whether the path is painted as an area',
);

/** 校验按记录顺序连接为一维轨迹的路径标记 */
export const PathPropertiesSchema = strictObject({
  connection: zodEnum(CoordinateConnection).default(CoordinateConnection.Coordinate).optional(),
  ...PathTransformSchema.shape,
  ...PathDecorationSchema.shape,
  color: CssColorSchema.optional(),
  closed: boolean()
    .optional()
    .describe(
      'Connect the last point back to the first, closing the path into a polygon; under polar this yields a radar outline. Default false',
    ),
  connectNulls: union([boolean(), PlotPathConnectNullsStyleSchema])
    .optional()
    .describe(
      'False or omitted splits at invalid projected points. True or an object bridges open unfilled paths with a default dashed stroke; object fields override bridge stroke only. Closed or filled paths accept boolean only',
    ),
  closure: PathClosureSchema.optional().describe(
    'Close the path using a cycle, a baseline, or a per-row stacked baseline. Set fill when the closed path should render as an area',
  ),
  curve: zodEnum(PathCurve).optional().describe('Connection curve between adjacent ordered points; default linear'),
  interpolation: zodEnum(PolarInterpolation)
    .optional()
    .describe('Polar2D connection-space override; omit to inherit the resolved coordinate interpolation'),
  strokeWidth: MarkNonnegativeNumberStyleSchema.optional().describe('Path stroke width: fixed core Path stroke width'),
  opacity: MarkOpacityStyleSchema.optional(),
  lineCap: PathLineCapStyleSchema.optional().describe('Path stroke endpoint style: fixed core Path lineCap'),
  lineJoin: PathLineJoinStyleSchema.optional().describe('Path stroke join style: fixed core Path lineJoin'),
  roundedCorners: PathRoundedCornersStyleSchema.optional().describe(
    'Path geometric corner radius: fixed core Path roundedCorners',
  ),
  ...corePathStyle,
  anchorId: AnchorIdSchema.optional().describe(
    'Stable id rule for generated per-datum core Coordinates along this path',
  ),
  label: MarkPathLabelListSchema.optional().describe('Path-host label: lowered onto the generated core Path.label'),
}).describe('Fixed data path properties and construction rules');

/** 校验按顶点组织的路径或逐实例完整端点，输入形态互斥 */
export const PathMarkEncodingSchema = union([
  PathEncodingSchema.extend({
    anchorId: NonBlankStringSchema.optional(),
    position: PositionEncodingSchema,
    from: never().optional(),
    to: never().optional(),
    series: NonBlankStringSchema.optional(),
    order: NonBlankStringSchema.optional(),
    closure: strictObject({ baseline: NonBlankStringSchema }).optional(),
  }),
  PathEncodingSchema.extend({
    anchorId: NonBlankStringSchema.optional(),
    from: PositionEncodingSchema,
    to: PositionEncodingSchema,
    position: never().optional(),
    series: never().optional(),
    order: never().optional(),
    closure: never().optional(),
  }),
]);

/** 校验按系列与顺序连接数据顶点的路径 */
export const PathMarkSchema = strictObject({
  ...markBase,
  type: literal(BuiltinPlotMark.Path),
  encodings: PathMarkEncodingSchema,
  properties: PathPropertiesSchema.optional(),
})
  .refine(hasValidAnchorSource, {
    path: ['properties', 'anchorId'],
    message: 'anchorId requires exactly one of field, template, or generator',
  })
  .describe('Data path mark; segment appearance uses its first row');

/** PathMark 闭合策略配置 */
export type IRPlotPathClosure = ZodInfer<typeof PathClosureSchema>;

/** path mark（折线 / 轮廓） */
export type IRPlotPathMark = ZodInfer<typeof PathMarkSchema>;

/** PathMark 填充规则样式值 */
export type IRPlotPathFillRuleStyle = ZodInfer<typeof PathFillRuleStyleSchema>;

/** PathMark scale 绑定样式值 */
export type IRPlotPathScaleStyle = ZodInfer<typeof PathScaleStyleSchema>;
