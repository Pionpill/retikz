import {
  NodeSchema,
  NodeLayoutSchema,
  PathTransformSchema,
  BendDirection,
  BoxSpacingSchema,
  FoldStepVia,
  PaintSchema,
  AnchorRefSchema,
  PathDecorationSchema,
  PathFillSchema,
  PathGeometrySchema,
  PathStrokeSchema,
  PositionSchema,
  StepLabelSchema,
  AxisScaleSchema,
  BoxSizeSchema,
  CssColorSchema,
  BlendMode,
  BoundarySchema,
  DropShadowSchema,
  FontSchema,
  NodeTextAlign,
  PathFillRuleSchema,
  PathLineCapSchema,
  PathLineJoinSchema,
  PathScaleSchema,
  PathThickness,
  ShadowPreset,
  ShapeValueSchema,
  OpacitySchema,
  StrokeDashPatternSchema,
} from '@retikz/core';
import { DataTransformDeclarationSchema } from '@retikz/data';
import { CenterlineRibbonPathOptionsSchema, TaperRibbonWidthSchema } from '@retikz/extension';
import {
  JsonValueSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import {
  array,
  boolean,
  discriminatedUnion,
  enum as zodEnum,
  literal,
  never,
  number,
  record,
  strictObject,
  union,
} from 'zod';

import { CoordinateConnection, PolarInterpolation } from '../coordinate';
import {
  ChannelSchema,
  VisualEncodingSchema,
  NodeEncodingSchema,
  PathEncodingSchema,
  PositionEncodingSchema,
  Position2DEncodingSchema,
  PositionInputSchema,
  MarkGeometryLabelListSchema,
  MarkNodeLabelListSchema,
  PointEncodingSchema,
} from '../encoding';
import { PlotLayerSchema } from '../plot/layer';
import { MarkPlacementSchema } from '../position-adjustment';
import { PointAutoPaddingSchema } from './auto-padding';
import {
  BUILTIN_MARK_TYPES,
  IntervalBoundKind,
  PathClosureKind,
  PathCurve,
  BuiltinPlotMark,
  RelationGeometryKind,
  RelationOrthogonalLabelStep,
  RelationRouteStepKind,
  RelationRoutingKind,
} from './constants';

/** 校验根变换之后执行、仅供当前标记消费的数据变换序列 */
export const MarkTransformSchema = array(DataTransformDeclarationSchema).describe(
  'Mark-local transform pipeline applied after the plot root transform to derive rows consumed only by this mark',
);

/** 复用标记局部变换规则，校验关系标记的数据变换序列 */
export const RelationTransformSchema = MarkTransformSchema;

const markBase = {
  contributeToDomain: boolean()
    .default(true)
    .optional()
    .describe('Include data-space positions in inferred domains; edges never contribute'),
  id: NonBlankStringSchema.optional().describe('Optional mark handle used by generated scope and anchor targets'),
  defaultColorGroup: NonBlankStringSchema.optional().describe(
    'Optional semantic group whose marks share one sequential palette.series slot when no explicit color is authored',
  ),
  defaultColorIndex: number()
    .int()
    .nonnegative()
    .optional()
    .describe('Explicit fallback index in palette.series; authored paints and field encodings take precedence'),
  layer: PlotLayerSchema.optional().describe(
    'Semantic plot layer override applied to the outer mark scope; mark datum zIndex remains a separate style channel',
  ),
  coordinateView: NonBlankStringSchema.optional().describe(
    'Coordinate view id this mark is projected through; omit to use the plot composition default view',
  ),
  transforms: MarkTransformSchema.optional().describe(
    'Optional mark-local transform pipeline applied after the plot root transform',
  ),
};

/** 校验生成 Core 节点或坐标标识的标记局部稳定锚点规则 */
export const AnchorIdSchema = strictObject({
  prefix: NonBlankStringSchema.optional().describe(
    'Optional id namespace under the current plot; defaults to the mark id, or mark.<index> when the mark has no id',
  ),
  template: NonBlankStringSchema.optional().describe(
    'JSON-safe id template supporting {plotId}, {markId}, {markIndex}, {index}, and {field:name} placeholders',
  ),
  generator: NonBlankStringSchema.optional().describe(
    'Runtime generator key resolved from LowerPlotsOptions.anchorIdGenerators; the function itself is not stored in the IRPlot',
  ),
})
  .superRefine((spec, ctx) => {
    const count = [spec.template, spec.generator].filter(value => value !== undefined).length;
    if (count > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'anchorId template and generator are mutually exclusive',
      });
    }
  })
  .describe('Mark-scoped stable anchor id rule for generated core Node / Coordinate ids');

/** 锚点的字段、模板和运行时生成器共同构成唯一标识来源 */
const hasValidAnchorSource = (mark: {
  properties?: { anchorId?: { template?: string; generator?: string } };
  encodings?: { anchorId?: string };
}): boolean => {
  const rule = mark.properties?.anchorId;
  const field = mark.encodings?.anchorId;
  if (rule === undefined && field === undefined) return true;
  return [field, rule?.template, rule?.generator].filter(value => value !== undefined).length === 1;
};

const anchorTargetFields = {
  anchor: AnchorRefSchema.optional().describe('Optional core anchor ref on the resolved target id'),
  offset: PositionSchema.optional().describe('Optional world-space offset applied after anchor resolution'),
  boundary: union([BoundarySchema, boolean()])
    .optional()
    .describe('Core target boundary override; true means shape, false omits the override'),
};

const DirectPlotTargetRefSchema = strictObject({
  id: NonBlankStringSchema.describe('Existing core Node / Coordinate id'),
  ...anchorTargetFields,
}).describe('Direct core target reference by id');

const GeneratedAnchorPlotTargetRefSchema = strictObject({
  anchorId: AnchorIdSchema.describe('Anchor id rule evaluated against the current relation row'),
  ...anchorTargetFields,
}).describe('Generated anchor target reference evaluated from the current relation row');

const ProjectedPlotTargetRefSchema = strictObject({
  anchorId: AnchorIdSchema.optional().describe('Optional id rule for the generated projected Coordinate'),
  ...anchorTargetFields,
}).describe('Projected coordinate target from the current relation row');

/** 校验关系或注解使用的直接标识、生成锚点或投影坐标目标 */
export const PlotTargetRefSchema = union([
  DirectPlotTargetRefSchema,
  GeneratedAnchorPlotTargetRefSchema,
  ProjectedPlotTargetRefSchema,
]).describe('Relation/annotation target reference: direct core id, generated mark anchor id, or projected coordinate');

/** 校验关系目标的字段依赖，固定引用与构造仍由 properties 表达 */
export const PlotTargetEncodingSchema = strictObject({
  position: PositionEncodingSchema.optional(),
  anchorId: NonBlankStringSchema.optional(),
}).describe('Relation target position or generated anchor field dependencies');

/** 校验关系路径步骤标签的固定配置 */
export const RelationStepLabelSchema = StepLabelSchema.extend({
  text: StepLabelSchema.shape.text.optional(),
}).describe('Fixed step label properties; field text is supplied by the corresponding encoding');

/** 校验仅供普通路径关系使用的 Core Path 选项 */
export const RelationPathSpecificOptionsSchema = strictObject({
  style: strictObject({
    dashPattern: PathStrokeSchema.shape.dashPattern,
    fillRule: PathFillSchema.shape.fillRule,
    lineCap: PathStrokeSchema.shape.lineCap,
    lineJoin: PathStrokeSchema.shape.lineJoin,
  })
    .partial()
    .describe('Path-only dash, fill rule, cap and join overrides'),
  roundedCorners: PathGeometrySchema.shape.roundedCorners,
  rotate: PathGeometrySchema.shape.rotate,
  scale: PathGeometrySchema.shape.scale,
  marks: PathDecorationSchema.shape.marks,
})
  .partial()
  .describe('Core Path options used only when RelationMark kind is path');

/** 校验可降低为 Core 路径步骤的关系路由动作 */
export const RelationRouteStepSchema = strictObject({
  kind: zodEnum(RelationRouteStepKind).describe('Core path step kind for this relation route segment'),
  to: PlotTargetRefSchema.optional().describe(
    'Target for this step; omitted on the last drawable step defaults to RelationMark.target',
  ),
  via: zodEnum(FoldStepVia).optional().describe('Fold direction for kind=fold'),
  control: PositionSchema.optional().describe('Quadratic Bezier control point for kind=curve'),
  control1: PositionSchema.optional().describe('First cubic Bezier control point for kind=cubic'),
  control2: PositionSchema.optional().describe('Second cubic Bezier control point for kind=cubic'),
  bendDirection: zodEnum(BendDirection).optional().describe('Bend direction for kind=bend'),
  bendAngle: number().gt(-180).lt(180).optional().describe('Bend angle for kind=bend'),
  outAngle: number().optional().describe('Outgoing angle for kind=bend'),
  inAngle: number().optional().describe('Incoming angle for kind=bend'),
  looseness: PositiveNumberSchema.optional().describe('Curve looseness for kind=bend'),
  label: RelationStepLabelSchema.optional().describe('Optional label attached to this drawable step'),
}).describe('Relation route step lowered to a core path step');

const RelationLineRoutingSchema = strictObject({
  kind: literal(RelationRoutingKind.Line).describe(
    'Discriminator: connect source, via points, and target with straight line steps',
  ),
}).describe('Line relation routing strategy');

const RelationBendRoutingSchema = strictObject({
  kind: literal(RelationRoutingKind.Bend).describe('Discriminator: connect each segment with a core bend step'),
  bendDirection: zodEnum(BendDirection).optional().describe('Bend side relative to each relation segment'),
  bendAngle: number().gt(-180).lt(180).optional().describe('Bend angle in degrees for each relation segment'),
  outAngle: number().optional().describe('Outgoing angle in degrees for bend routing'),
  inAngle: number().optional().describe('Incoming angle in degrees for bend routing'),
  looseness: PositiveNumberSchema.optional().describe('Curve looseness factor for bend routing'),
}).describe('Bend relation routing strategy');

/** 关系标记算法式正交路由支持的两段折线方向 */
const RelationOrthogonalRoutingVia = {
  HorizontalThenVertical: FoldStepVia.HorizontalThenVertical,
  VerticalThenHorizontal: FoldStepVia.VerticalThenHorizontal,
} as const;

const RelationOrthogonalRoutingSchema = strictObject({
  kind: literal(RelationRoutingKind.Orthogonal).describe(
    'Discriminator: connect each segment with right-angle orthogonal line steps',
  ),
  via: zodEnum(RelationOrthogonalRoutingVia)
    .optional()
    .describe('Orthogonal direction: -| first horizontal then vertical; |- first vertical then horizontal'),
  labelStep: zodEnum(RelationOrthogonalLabelStep)
    .optional()
    .describe('Which generated drawable step receives the shorthand relation label; default main'),
})
  .superRefine((routing, ctx) => {
    if (routing.via === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['via'],
        message: 'orthogonal relation routing requires via',
      });
    }
  })
  .describe('Orthogonal relation routing strategy');

/** 校验端点引用解析后生成 Core 步骤的关系路由策略 */
export const RelationRoutingSchema = discriminatedUnion('kind', [
  RelationLineRoutingSchema,
  RelationBendRoutingSchema,
  RelationOrthogonalRoutingSchema,
]).describe('Relation route strategy lowered to core Path steps after source and target refs are resolved');

const nodeHostLabel = {
  label: MarkNodeLabelListSchema.optional().describe(
    'Node-host label: lowered onto each datum Node.label (core border-relative placement)',
  ),
};

const geometryHostLabel = {
  label: MarkGeometryLabelListSchema.optional().describe(
    'Geometry-host label: lowered onto the generated core Path.label',
  ),
};

const StylePaintSchema = union([CssColorSchema, PaintSchema]);

const StyleNumberSchema = number();

const StyleShadowSchema = union([zodEnum(ShadowPreset), DropShadowSchema]);

const StyleBlendModeSchema = zodEnum(BlendMode);

const StyleBoxSpacingSchema = union([NonNegativeNumberSchema, BoxSpacingSchema]);

const StyleAxisScaleSchema = union([PositiveNumberSchema, AxisScaleSchema]);

const StyleBoxSizeSchema = union([NonNegativeNumberSchema, BoxSizeSchema]);

/** 校验点填充的固定颜色、结构化填充 */
export const PointFillStyleSchema = StylePaintSchema.describe('point fill style value');

/** 校验点主色的固定 CSS 颜色 */
export const PointColorStyleSchema = CssColorSchema.describe('point color value');

/** 校验点尺寸的非负常量半径 */
export const PointSizeStyleSchema = NonNegativeNumberSchema.describe('point size value');

/** 校验点形状的固定 Core 形状引用 */
export const PointShapeStyleSchema = ShapeValueSchema.describe('point shape value');

/** 校验点描边的固定颜色、结构化填充 */
export const PointStrokeStyleSchema = StylePaintSchema.describe('point stroke style value');

/** 校验数值样式的有限常量 */
export const PointNumberStyleSchema = StyleNumberSchema.describe('point numeric style value');

/** 校验非负数值样式的常量 */
export const PointNonnegativeNumberStyleSchema = NonNegativeNumberSchema.describe(
  'point non-negative numeric style value',
);

/** 校验透明度样式的0 到 1 常量 */
export const PointOpacityStyleSchema = OpacitySchema.describe('point opacity style value');

/** 校验堆叠次序的整数常量 */
export const PointZIndexStyleSchema = number().int().describe('point zIndex style value');

/** 校验节点正数样式的常量 */
export const NodePositiveNumberStyleSchema = PositiveNumberSchema.describe('node positive numeric style value');

/** 校验节点文本对齐的固定关键字 */
export const NodeTextAlignStyleSchema = zodEnum(NodeTextAlign).describe('node text align style value');

/** 校验节点布尔样式的常量 */
export const NodeBooleanStyleSchema = boolean().describe('node boolean style value');

/** 校验节点虚线样式的固定长度序列 */
export const NodeDashPatternStyleSchema = StrokeDashPatternSchema.describe('node dashPattern style value');

/** 校验节点字体的固定字体对象 */
export const NodeFontStyleSchema = FontSchema.describe('node font style value');

/** 校验节点连接面的固定连接面引用 */
export const NodeBoundaryStyleSchema = BoundarySchema.describe('node boundary style value');

/** 校验节点盒间距的固定数值与四边覆盖 */
export const NodeBoxSpacingStyleSchema = StyleBoxSpacingSchema.describe('node box spacing style value');

/** 校验节点缩放的固定统一与双轴倍率 */
export const NodeAxisScaleStyleSchema = StyleAxisScaleSchema.describe('node scale style value');

/** 校验节点盒尺寸的固定统一与宽高覆盖 */
export const NodeBoxSizeStyleSchema = StyleBoxSizeSchema.describe('node box size style value');

/** 校验投影样式的固定预设与对象 */
export const ShadowStyleSchema = StyleShadowSchema.describe('shadow style value');

/** 校验混合模式的固定关键字 */
export const BlendModeStyleSchema = StyleBlendModeSchema.describe('blendMode style value');

/** 校验路径线帽的固定形状 */
export const PathLineCapStyleSchema = PathLineCapSchema.describe('path lineCap style value');

/** 校验路径拐角连接的固定形状 */
export const PathLineJoinStyleSchema = PathLineJoinSchema.describe('path lineJoin style value');

/** 校验路径圆角的固定非负半径 */
export const PathRoundedCornersStyleSchema = NonNegativeNumberSchema.describe('path roundedCorners style value');

/** 校验路径填充规则的固定环绕规则 */
export const PathFillRuleStyleSchema = PathFillRuleSchema.describe('path fillRule style value');

/** 校验路径粗细的固定预设 */
export const PathThicknessStyleSchema = zodEnum(PathThickness).describe('path thickness style value');

/** 校验路径缩放的固定统一与双轴倍率 */
export const PathScaleStyleSchema = PathScaleSchema.describe('path scale style value');

/** 校验整体、填充与描边各自的固定透明度 */
export const MarkOpacityStyleSchema = strictObject({
  overall: PointOpacityStyleSchema.optional().describe(
    'Overall opacity binding, multiplied by fill and stroke factors.',
  ),
  fill: PointOpacityStyleSchema.optional().describe('Independent fill opacity binding.'),
  stroke: PointOpacityStyleSchema.optional().describe('Independent stroke opacity binding.'),
}).describe('Sparse independent opacity channel bindings.');

/** 校验各关系路径种类共用的图元视觉样式 */
export const RelationPrimitiveStyleSchema = strictObject({
  color: PointColorStyleSchema.optional().describe('Shared relation master color: fixed color'),
  fill: PointFillStyleSchema.optional().describe('Shared relation fill paint: fixed CSS color / IRPaint'),
  stroke: PointStrokeStyleSchema.optional().describe('Shared relation stroke paint: fixed CSS color / IRPaint'),
  strokeWidth: PointNonnegativeNumberStyleSchema.optional().describe(
    'Shared relation stroke width: fixed non-negative value',
  ),
  opacity: MarkOpacityStyleSchema.optional(),
  shadow: ShadowStyleSchema.optional().describe('Shared relation shadow: fixed preset / object'),
  blendMode: BlendModeStyleSchema.optional().describe('Shared relation blendMode: fixed blend mode'),
  zIndex: PointZIndexStyleSchema.optional().describe('Shared relation zIndex: fixed integer'),
}).describe('Style fields shared by RelationMark path kinds');

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

const coreNodeStyle = {
  align: NodeTextAlignStyleSchema.optional().describe('Core Node text alignment: fixed start / middle / end'),
  lineHeight: NodePositiveNumberStyleSchema.optional().describe('Core Node lineHeight: fixed positive value'),
  maxTextWidth: NodePositiveNumberStyleSchema.optional().describe('Core Node maxTextWidth: fixed positive value'),
  cornerRadius: PointNonnegativeNumberStyleSchema.optional().describe(
    'Core Node cornerRadius: fixed non-negative value',
  ),
  scale: NodeAxisScaleStyleSchema.optional().describe('Core Node scale: fixed number / {default,x,y}'),
  padding: NodeBoxSpacingStyleSchema.optional().describe('Core Node padding: fixed box spacing'),
  margin: NodeBoxSpacingStyleSchema.optional().describe('Core Node margin: fixed box spacing'),
  dashed: NodeBooleanStyleSchema.optional().describe('Core Node dashed: fixed boolean'),
  dotted: NodeBooleanStyleSchema.optional().describe('Core Node dotted: fixed boolean'),
  dashPattern: NodeDashPatternStyleSchema.optional().describe('Core Node dashPattern: fixed number array'),
  font: NodeFontStyleSchema.optional().describe('Core Node font: fixed font object'),
  boundary: NodeBoundaryStyleSchema.optional().describe('Core Node boundary: fixed boundary value'),
  shadow: ShadowStyleSchema.optional().describe('Core Node shadow: fixed preset / object'),
  blendMode: BlendModeStyleSchema.optional().describe('Core Node blendMode: fixed blend mode'),
};

const corePathStyle = {
  fill: PointFillStyleSchema.optional().describe('Core Path fill paint: fixed CSS color / IRPaint'),
  stroke: PointStrokeStyleSchema.optional().describe('Core Path stroke paint: fixed CSS color / IRPaint'),
  zIndex: PointZIndexStyleSchema.optional().describe('Core Path zIndex: fixed integer'),
  rotate: PointNumberStyleSchema.optional().describe('Core Path rotate: fixed angle'),
  scale: PathScaleStyleSchema.optional().describe('Core Path scale: fixed number / {x,y}'),
  fillRule: PathFillRuleStyleSchema.optional().describe('Core Path fillRule: fixed nonzero / evenodd'),
  thickness: PathThicknessStyleSchema.optional().describe('Core Path thickness: fixed preset'),
  marks: PathDecorationSchema.shape.marks
    .optional()
    .describe('Static core Path marks placed along the lowered path; use endpoint marks for arrows'),
  dashPattern: NodeDashPatternStyleSchema.optional().describe('Core Path dashPattern: fixed number array'),
  shadow: ShadowStyleSchema.optional().describe('Core Path shadow: fixed preset / object'),
  blendMode: BlendModeStyleSchema.optional().describe('Core Path blendMode: fixed blend mode'),
};

/** 校验节点相对屏幕或坐标角色的方向意图 */
export const MarkOrientationSchema = union([
  strictObject({ kind: literal('screen') }),
  strictObject({
    kind: literal('coordinate'),
    role: NonBlankStringSchema.describe('Coordinate role whose mapped parameter defines the local curve'),
    align: zodEnum(['tangent', 'normal']).describe('Align local positive x with the tangent or its positive normal'),
  }),
]).describe('Node orientation reference; omitted means screen orientation');

/** 校验逐记录生成点图形或文本节点的点标记 */
export const PointPropertiesSchema = strictObject({
  orientation: MarkOrientationSchema.optional(),
  autoPadding: PointAutoPaddingSchema.default('max-radius').optional(),
  color: PointColorStyleSchema.optional().describe('Glyph color: fixed color; overrides constant fill'),
  textColor: PointColorStyleSchema.optional().describe(
    'Text point color: fixed core Node textColor; only applied when encoding.text is set',
  ),
  size: PointSizeStyleSchema.optional().describe(
    'Glyph size: field-bound datum channel via a sqrt radius scale or constant final radius',
  ),
  shape: PointShapeStyleSchema.optional().describe(
    'Glyph shape: field-bound categorical channel or constant core Node shape name',
  ),
  fill: PointFillStyleSchema.optional().describe('Glyph fill: fixed core Node fill paint'),
  stroke: PointStrokeStyleSchema.optional().describe('Glyph stroke paint: fixed core Node stroke paint'),
  strokeWidth: PointNonnegativeNumberStyleSchema.optional().describe(
    'Glyph stroke width: fixed core Node stroke width',
  ),
  opacity: MarkOpacityStyleSchema.optional(),
  rotate: PointNumberStyleSchema.optional().describe('Glyph rotation in degrees: fixed angle'),
  minimumSize: NodeBoxSizeStyleSchema.optional().describe(
    'Minimum visual size: fixed number / {default,width,height}; overridden per datum by size',
  ),
  zIndex: PointZIndexStyleSchema.optional().describe('Drawing order hint: fixed zIndex'),
  ...coreNodeStyle,
  dx: number()
    .optional()
    .describe(
      'Fine-tuning horizontal offset (user units) from the projected anchor; positive = right. Mainly for text points; prefer label position/distance. Default 0',
    ),
  dy: number()
    .optional()
    .describe(
      'Fine-tuning vertical offset (user units) from the projected anchor; positive = screen-down. Mainly for text points. Default 0',
    ),
  anchorId: AnchorIdSchema.optional().describe(
    'Stable id rule written to each generated core Node; takes precedence over datumIdField for the node id',
  ),
  placement: MarkPlacementSchema.optional().describe(
    'Position adjustments applied after position scale mapping and before mark geometry',
  ),
  ...nodeHostLabel,
  width: NodeLayoutSchema.shape.width,
  text: NodeSchema.shape.text,
  displayFormat: NonBlankStringSchema.optional(),
}).describe('Fixed point properties and construction parameters');

/** 校验逐记录点的身份、字段编码与固定属性 */
export const PointMarkSchema = strictObject({
  ...markBase,
  type: literal(BuiltinPlotMark.Point),
  encodings: PointEncodingSchema,
  properties: PointPropertiesSchema.optional(),
})
  .refine(hasValidAnchorSource, {
    path: ['properties', 'anchorId'],
    message: 'anchorId requires exactly one of field, template, or generator',
  })
  .describe('Data point mark');

/** Relation projected target 可选端点 glyph 的封闭 Point 表现字段 */
export const RelationEndpointGlyphSchema = strictObject({
  ...PointPropertiesSchema.pick({
    color: true,
    size: true,
    shape: true,
    fill: true,
    stroke: true,
    strokeWidth: true,
    opacity: true,
    rotate: true,
    minimumSize: true,
  }).shape,
}).describe('Constant Point glyph appearance emitted at a projected Relation endpoint');

/** Relation source / target 的可选端点 glyph 配置 */
export const RelationEndpointGlyphsSchema = strictObject({
  source: RelationEndpointGlyphSchema.optional(),
  target: RelationEndpointGlyphSchema.optional(),
})
  .refine(endpoints => endpoints.source !== undefined || endpoints.target !== undefined, {
    message: 'relation endpoints require source or target glyph configuration',
  })
  .describe('Optional source and target glyphs emitted atomically with a projected Relation row');

/** 开放轨迹跨缺值连接段的常量描边覆盖 */
export const PlotPathConnectNullsStyleSchema = PathStrokeSchema.extend({
  stroke: CssColorSchema.optional(),
  strokeOpacity: OpacitySchema.optional(),
  dashPattern: PathStrokeSchema.shape.dashPattern.unwrap().default([6, 4]).optional(),
}).describe('Stroke overrides for bridges across missing projected points in an open unfilled path');

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
  strokeWidth: PointNonnegativeNumberStyleSchema.optional().describe('Path stroke width: fixed core Path stroke width'),
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
  ...geometryHostLabel,
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

const BandBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Band).describe(
    'Band bound: center from the role position channel, width from the band scale bandwidth',
  ),
}).describe(
  'Band bound: a category band on this role (bar primary, heatmap axis, polar angle band); optional group → dodge sub-bands',
);

const SpanBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Span).describe('Span bound: from a baseline to the role position channel value'),
  baseline: number()
    .optional()
    .describe('Baseline the span starts from; the interval runs baseline→channel value. Default 0'),
}).describe('Span bound: baseline→value interval (bar height, radial-bar radius)');

const ExtentBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Extent).describe('Extent bound: an explicit interval read from two fields'),
}).describe('Extent bound: explicit [from, to] field interval (histogram bin / stacked bar / cumulative pie angle)');

const ProportionalBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Proportional).describe(
    'Proportional bound: contiguous intervals whose widths are driven by a numeric field',
  ),
}).describe('Proportional bound: contiguous variable-width intervals along this role (variable-width bar / mosaic)');

const FullBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Full).describe('Full bound: span the whole coordinate domain of this role'),
}).describe('Full bound: spans the role coordinate domain (pie / donut radius, inner→outer)');

/** 校验单个位置角色的带宽、跨度、显式边界、比例或全范围区间来源 */
export const IntervalBoundSchema = discriminatedUnion('kind', [
  BandBoundSchema,
  SpanBoundSchema,
  ExtentBoundSchema,
  ProportionalBoundSchema,
  FullBoundSchema,
]).describe('Single-role interval bound source: band / span / extent / proportional / full');

/** 校验二维区间构造模式，未声明模式由对应尺度推导 */
export const IntervalBoundsSchema = strictObject({
  x: IntervalBoundSchema.optional(),
  y: IntervalBoundSchema.optional(),
}).describe('Interval construction for x/y; omitted modes are inferred from role scales');

/** 校验由各角色区间与坐标系共同确定几何的区间标记 */
export const IntervalPropertiesSchema = strictObject({
  connection: zodEnum(CoordinateConnection).default(CoordinateConnection.Coordinate).optional(),
  color: CssColorSchema.optional(),
  bounds: IntervalBoundsSchema.optional().describe(
    'Per-role interval bounds keyed by coordinate role; omit to infer from the coordinate role',
  ),
  interpolation: zodEnum(PolarInterpolation)
    .optional()
    .describe('Polar2D cell-boundary override; omit to inherit the resolved coordinate interpolation'),
  strokeWidth: PointNonnegativeNumberStyleSchema.optional().describe(
    'Interval cell stroke width: fixed core Node stroke width',
  ),
  fill: PointFillStyleSchema.optional().describe('Interval cell fill paint: fixed CSS color / IRPaint'),
  stroke: PointStrokeStyleSchema.optional().describe('Interval cell stroke paint: fixed CSS color / IRPaint'),
  opacity: MarkOpacityStyleSchema.optional(),
  padAngle: NonNegativeNumberSchema.optional().describe(
    'Angular gap in degrees applied to polar cells; each cell shrinks by half this angle on both sides before sector or chord-contour projection. Cartesian cells ignore it',
  ),
  pull: PointNonnegativeNumberStyleSchema.optional().describe(
    'Static radial offset in user units for polar cells; moves the local projection center along the final mid angle before sector or chord-contour projection',
  ),
  anchorId: AnchorIdSchema.optional().describe(
    'Stable id rule written to each generated core interval Node; takes precedence over datumIdField for the node id',
  ),
  ...coreNodeStyle,
  ...nodeHostLabel,
}).describe('Fixed interval construction rules and appearance');

/** 校验区间角色的字段来源 */
export const IntervalBoundEncodingSchema = strictObject({
  group: NonBlankStringSchema.optional(),
  from: PositionInputSchema.optional(),
  to: PositionInputSchema.optional(),
  weight: NonBlankStringSchema.optional(),
});

/** 校验数据区间的位置、分组与边界编码 */
export const IntervalEncodingSchema = NodeEncodingSchema.extend({
  anchorId: NonBlankStringSchema.optional(),
  position: Position2DEncodingSchema.omit({ z: true }).partial().optional(),
  series: NonBlankStringSchema.optional(),
  bounds: strictObject({
    x: IntervalBoundEncodingSchema.optional(),
    y: IntervalBoundEncodingSchema.optional(),
  }).optional(),
  pull: ChannelSchema.optional(),
});

/** 校验按坐标角色区间生成的数据图元 */
export const IntervalMarkSchema = strictObject({
  ...markBase,
  type: literal(BuiltinPlotMark.Interval),
  encodings: IntervalEncodingSchema.optional(),
  properties: IntervalPropertiesSchema.optional(),
})
  .refine(hasValidAnchorSource, {
    path: ['properties', 'anchorId'],
    message: 'anchorId requires exactly one of field, template, or generator',
  })
  .describe('Data interval mark');

/** 校验普通路径关系的插值、路由、标签与路径选项 */
export const RelationPathGeometrySchema = strictObject({
  interpolation: zodEnum(PolarInterpolation)
    .optional()
    .describe('Polar2D default projected-target path override; explicit route, routing, and ribbon do not consume it'),
  via: array(PlotTargetRefSchema)
    .optional()
    .describe('Optional intermediate waypoints; each projected waypoint may generate a core Coordinate'),
  route: array(RelationRouteStepSchema)
    .min(1)
    .optional()
    .describe('Explicit route steps after the initial move(source) step'),
  routing: RelationRoutingSchema.optional().describe(
    'Optional algorithmic route strategy; omitted means straight line routing',
  ),
  label: RelationStepLabelSchema.optional().describe(
    'Convenience label attached to the default route or the final drawable explicit route step',
  ),
  options: RelationPathSpecificOptionsSchema.optional().describe('Core Path options used only by path relations'),
})
  .superRefine((path, ctx) => {
    if (path.route !== undefined && path.routing !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['routing'],
        message: 'relation mark cannot use route and routing together; use explicit route steps or a routing strategy',
      });
    }

    if (path.via !== undefined && path.route !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['via'],
        message:
          'relation mark cannot use via and route together; encode waypoints as route steps when route is explicit',
      });
    }
  })
  .describe('Path geometry configuration for RelationMark');

/** 校验仅供带状关系使用的插值、对齐和采样选项 */
export const RelationRibbonSpecificOptionsSchema = strictObject({
  interpolation: TaperRibbonWidthSchema.shape.interpolation.unwrap().optional(),
  align: CenterlineRibbonPathOptionsSchema.shape.align.unwrap().optional(),
  sampling: CenterlineRibbonPathOptionsSchema.shape.sampling.unwrap().optional(),
}).describe('Extension Ribbon options used only by ribbon relations');

/** 校验带状关系的起止宽度及专属几何选项 */
export const RelationRibbonOptionsSchema = strictObject({
  width: PointNonnegativeNumberStyleSchema.optional().describe(
    'Ribbon width at the source side, or the whole width when endWidth is omitted',
  ),
  endWidth: PointNonnegativeNumberStyleSchema.optional().describe(
    'Optional ribbon width at the target side; set together with width for tapered ribbons',
  ),
  options: RelationRibbonSpecificOptionsSchema.optional().describe(
    'Core Path kind=ribbon options used only by ribbon relations',
  ),
}).describe('Ribbon geometry configuration for RelationMark');

/** 校验连接源与目标的关系标记，kind 决定普通描边或带状路径语义 */
export const RelationGeometrySchema = discriminatedUnion('kind', [
  RelationPathGeometrySchema.safeExtend({ kind: literal(RelationGeometryKind.Path) }),
  RelationRibbonOptionsSchema.safeExtend({ kind: literal(RelationGeometryKind.Ribbon) }),
]).describe('Relation path or ribbon construction');

/** 校验关系固定目标与几何属性 */
export const RelationPropertiesSchema = RelationPrimitiveStyleSchema.extend({
  source: PlotTargetRefSchema.optional(),
  target: PlotTargetRefSchema.optional(),
  geometry: RelationGeometrySchema,
  endpoints: RelationEndpointGlyphsSchema.optional(),
  autoPadding: PointAutoPaddingSchema.default(false).optional(),
  ...geometryHostLabel,
});

/** 校验关系几何与目标中的字段依赖 */
export const RelationEncodingSchema = VisualEncodingSchema.extend({
  source: PlotTargetEncodingSchema.optional(),
  target: PlotTargetEncodingSchema.optional(),
  label: PathEncodingSchema.shape.label,
  geometry: strictObject({
    width: ChannelSchema.optional(),
    endWidth: ChannelSchema.optional(),
    via: array(PlotTargetEncodingSchema).optional(),
    route: array(
      strictObject({
        to: PlotTargetEncodingSchema.optional(),
        label: strictObject({ text: NonBlankStringSchema.optional() }).optional(),
      }),
    ).optional(),
    label: strictObject({ text: NonBlankStringSchema.optional() }).optional(),
  }).optional(),
});

/** 校验按记录连接目标的关系标记 */
export const RelationMarkSchema = strictObject({
  ...markBase,
  type: literal(BuiltinPlotMark.Relation),
  encodings: RelationEncodingSchema.optional(),
  properties: RelationPropertiesSchema,
})
  .superRefine((mark, ctx) => {
    const { properties, encodings } = mark;
    const geometry = properties.geometry;
    for (const role of ['source', 'target'] as const) {
      if (properties[role] === undefined && encodings?.[role] === undefined) {
        ctx.addIssue({ code: 'custom', path: ['properties', role], message: 'Relation requires both targets' });
      }
    }
    if (geometry.kind === 'ribbon') {
      if (geometry.width === undefined && encodings?.geometry?.width === undefined) {
        ctx.addIssue({ code: 'custom', path: ['properties', 'geometry', 'width'], message: 'Ribbon requires a width' });
      }
      if (
        geometry.options?.interpolation !== undefined &&
        geometry.endWidth === undefined &&
        encodings?.geometry?.endWidth === undefined
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['properties', 'geometry', 'options', 'interpolation'],
          message: 'Ribbon interpolation requires endWidth',
        });
      }
      for (const name of ['via', 'route', 'label'] as const) {
        if (encodings?.geometry?.[name] !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['encodings', 'geometry', name],
            message: 'Ribbon does not support path route encodings',
          });
        }
      }
    } else {
      for (const name of ['width', 'endWidth'] as const) {
        if (encodings?.geometry?.[name] !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['encodings', 'geometry', name],
            message: 'Path does not support ribbon width encodings',
          });
        }
      }
    }
    if (properties.endpoints === undefined) return;
    if (geometry.kind !== 'path') {
      ctx.addIssue({
        code: 'custom',
        path: ['properties', 'endpoints'],
        message: 'Endpoint glyphs require path geometry',
      });
      return;
    }
    if (
      geometry.via !== undefined ||
      geometry.route !== undefined ||
      encodings?.geometry?.via !== undefined ||
      encodings?.geometry?.route !== undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['properties', 'endpoints'],
        message: 'Endpoint glyphs cannot use via or route',
      });
    }
    for (const role of ['source', 'target'] as const) {
      const target = properties[role];
      const encoding = encodings?.[role];
      if (encoding?.position === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['properties', role],
          message: 'Endpoint glyphs require projected targets',
        });
      }
      if (
        (target !== undefined &&
          ('id' in target ||
            ('anchorId' in target && target.anchorId !== undefined) ||
            target.anchor !== undefined ||
            target.offset !== undefined ||
            target.boundary !== undefined)) ||
        encoding?.anchorId !== undefined
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['properties', role],
          message: 'Endpoint glyph targets cannot use anchor, offset, boundary, id or anchorId',
        });
      }
    }
  })
  .describe('Data relation mark');

/** 校验内置点、路径、区间与关系标记 */
export const MarkSchema = discriminatedUnion('type', [
  PointMarkSchema,
  PathMarkSchema,
  IntervalMarkSchema,
  RelationMarkSchema,
]).describe('Mark union: dimensional marks (point / path / interval) and source-target relation marks');

const CustomMarkObjectSchema = strictObject({
  ...markBase,
  type: NonBlankStringSchema.refine(type => !BUILTIN_MARK_TYPES.has(type), {
    message: 'custom mark type must not collide with a built-in mark type',
  }),
  encodings: record(NonBlankStringSchema, JsonValueSchema).optional(),
  properties: record(NonBlankStringSchema, JsonValueSchema).optional(),
});

/** 校验自定义标记外壳，精确目标由注册定义校验 */
export const CustomMarkSchema = CustomMarkObjectSchema.describe(
  'Custom mark Source; registered definition validates its targets',
);

/** 校验内置或自定义标记操作 */
export const MarkOperationSchema = union([MarkSchema, CustomMarkSchema]).describe(
  'Built-in and registered custom mark configurations',
);
