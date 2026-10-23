import type { ValueOf } from '@retikz/foundation';
import { NonNegativeNumberSchema, NonBlankStringSchema, NormalizedFractionSchema } from '@retikz/foundation';
import { array, number, enum as zodEnum, strictObject, union, lazy } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { ShadowPreset, DropShadowSchema, BlendMode } from './effects';
import { PaintSchema } from './paint';

/** 路径端点线帽关键字 */
export const PathLineCap = {
  /** 平切端点：描边精确停在路径端点，不向外延伸 */
  Butt: 'butt',
  /** 圆形端点：在线段端点额外绘制半圆，视觉上更柔和 */
  Round: 'round',
  /** 方形端点：在线段端点外延伸半个线宽，形成方头 */
  Square: 'square',
} as const;

/** 路径拐角连接关键字 */
export const PathLineJoin = {
  /** 尖角连接：两段描边外边缘延长相交，适合保留锐利转角 */
  Miter: 'miter',
  /** 圆角连接：用圆弧连接两段描边，适合柔和转角 */
  Round: 'round',
  /** 斜切连接：削平尖角，避免锐角处产生过长尖峰 */
  Bevel: 'bevel',
} as const;

/** 路径端点线帽关键字类型 */
export type PathLineCap = ValueOf<typeof PathLineCap>;

/** 路径拐角连接关键字类型 */
export type PathLineJoin = ValueOf<typeof PathLineJoin>;

/** 校验由非负长度构成的非空虚线序列，长度采用用户单位 */
export const StrokeDashPatternSchema = array(NonNegativeNumberSchema)
  .min(1)
  .describe('Stroke dash pattern lengths in user units.');

/** 校验用户单位下的虚线相位偏移，允许有限负值 */
export const StrokeDashOffsetSchema = number().describe(
  'Stroke dash offset in user units. Positive and negative finite values are allowed.',
);

/** 校验路径端点的线帽形状关键字 */
export const PathLineCapSchema = zodEnum(PathLineCap).describe('Path stroke endpoint cap keyword.');

/** 校验路径拐角的连接样式关键字 */
export const PathLineJoinSchema = zodEnum(PathLineJoin).describe('Path stroke corner join keyword.');

/** 校验用户单位下的非负描边宽度 */
export const StrokeWidthSchema = NonNegativeNumberSchema.describe('Stroke width in user units.');

/** 校验路径端点线帽与拐角连接样式 */
export const StrokeCapJoinSchema = strictObject({
  lineCap: PathLineCapSchema.optional().describe(
    'Stroke endpoint shape. Omitted fields use butt; round adds a half-disc cap and square extends past the endpoint.',
  ),
  lineJoin: PathLineJoinSchema.optional().describe(
    'Stroke corner shape. Omitted fields use miter; round rounds the join and bevel cuts the corner flat.',
  ),
}).describe('Stroke endpoint caps and corner joins.');

/** 校验非空 CSS 颜色字符串，不解析颜色语法 */
export const CssColorSchema = NonBlankStringSchema.describe('Non-blank CSS color string.');

/** 校验闭区间 0 到 1 内的不透明度 */
export const OpacitySchema = NormalizedFractionSchema.describe('Opacity value in the inclusive 0..1 range.');

/** 校验精确 CSS 颜色或基于有效主色计算的归一化权重 */
export const ContextualColorSchema = union([CssColorSchema, NormalizedFractionSchema]).describe(
  'Contextual color: an exact CSS color string or a normalized weight derived from the effective master color.',
);

/** 校验上下文颜色或结构化渐变、图案填充 */
export const PaintValueSchema = union([ContextualColorSchema, lazy(() => PaintSchema)]).describe(
  'Paint value: a contextual color or an IRPaint object.',
);

/** 校验供主体几何及其装饰继承的主色 */
export const GraphicColorSchema = strictObject({
  color: CssColorSchema.optional().describe(
    'Master color for primary geometry. Stroke, fill, labels, and arrows may inherit it unless individually overridden.',
  ),
}).describe('Master color inherited by primary geometry and its decorations.');

/** 校验作用于整个主体图形的不透明度 */
export const GraphicElementOpacitySchema = strictObject({
  opacity: OpacitySchema.optional().describe('Whole-element opacity applied to primary geometry.'),
}).describe('Whole-element opacity for primary geometry.');

/** 校验填充颜色 */
export const GraphicFillSchema = strictObject({
  fill: PaintValueSchema.optional().describe('Fill paint for primary geometry: contextual color or IRPaint.'),
}).describe('Fill paint for primary geometry.');

/** 校验描边颜色、线宽与虚线样式 */
export const GraphicStrokeSchema = strictObject({
  ...StrokeCapJoinSchema.shape,
  strokeWidth: StrokeWidthSchema.optional().describe('Stroke width in user units.'),
  dashPattern: StrokeDashPatternSchema.optional().describe(
    'Stroke dash pattern lengths in user units. Omitted fields mean solid line.',
  ),
  dashOffset: StrokeDashOffsetSchema.optional().describe(
    'Stroke dash offset in user units. Positive and negative finite values are allowed.',
  ),
  stroke: PaintValueSchema.optional().describe('Stroke paint for primary geometry: contextual color or IRPaint.'),
}).describe('Graphic stroke paint, width, dash pattern, and dash offset.');

/** 校验主体几何共享的主色、填充与描边字段 */
export const GraphicPaintSchema = strictObject({
  ...GraphicColorSchema.shape,
  fill: GraphicFillSchema.shape.fill,
  stroke: GraphicStrokeSchema.shape.stroke,
}).describe('Graphic paint fields shared by primary geometry.');

/** 校验可独立继承的整体、填充与描边不透明度 */
export const GraphicOpacityValueSchema = union([
  OpacitySchema,
  strictObject({
    overall: OpacitySchema.optional().describe('Overall opacity, multiplied by fill and stroke opacity.'),
    fill: OpacitySchema.optional().describe('Fill opacity factor, independent of the overall factor.'),
    stroke: OpacitySchema.optional().describe('Stroke opacity factor, independent of the overall factor.'),
  }),
]).describe('A scalar overall opacity or sparse overall, fill and stroke factors; omitted factors inherit.');

/** 校验主体几何的渐进式透明度字段 */
export const GraphicOpacitySchema = strictObject({
  opacity: GraphicOpacityValueSchema.optional(),
}).describe('Graphic opacity: scalar overall value or independent overall, fill and stroke factors.');

/** 校验主体几何的投影与混合模式 */
export const GraphicEffectsSchema = strictObject({
  shadow: union([zodEnum(ShadowPreset), lazy(() => DropShadowSchema)])
    .optional()
    .describe(
      'Drop shadow on the emitted primary geometry. A preset keyword (`sm`/`md`/`lg`/`xl`/`2xl`/`none`) or an explicit drop-shadow object.',
    ),
  blendMode: zodEnum(BlendMode)
    .optional()
    .describe(
      'How the emitted primary geometry blends with content already drawn beneath it. Omitted / `normal` means ordinary source-over.',
    ),
}).describe('Graphic effect fields shared by primary geometry.');

/** 校验节点和可绘制几何的共同视觉样式 */
export const GraphicStyleSchema = strictObject({
  ...GraphicColorSchema.shape,
  ...GraphicFillSchema.shape,
  ...GraphicStrokeSchema.shape,
  ...GraphicOpacitySchema.shape,
  ...GraphicEffectsSchema.shape,
}).describe('Graphic style fields for primary node / drawable geometry.');

/** 校验可向节点和路径后代级联继承的图形样式 */
export const CascadingGraphicStyleSchema = strictObject({
  ...GraphicColorSchema.shape,
  ...GraphicFillSchema.shape,
  ...GraphicStrokeSchema.shape,
  ...GraphicOpacitySchema.shape,
  ...GraphicEffectsSchema.shape,
}).describe('Cascading graphic style fields shared by node and path-like elements.');

/** 精确 CSS 颜色或从有效主色派生的归一化权重 */
export type IRContextualColor = ZodInfer<typeof ContextualColorSchema>;

/** 用于填充或描边的上下文颜色或结构化绘制资源 */
export type IRPaintValue = ZodInfer<typeof PaintValueSchema>;

/** 主体几何的主色、填充、描边、透明度与视觉效果 */
export type IRGraphicStyle = ZodInfer<typeof GraphicStyleSchema>;

/** 主体几何的描边绘制、线宽、虚线、端帽与连接样式 */
export type IRGraphicStroke = ZodInfer<typeof GraphicStrokeSchema>;

/** 描边 dash / gap 长度序列 */
export type StrokeDashPattern = ZodInfer<typeof StrokeDashPatternSchema>;
