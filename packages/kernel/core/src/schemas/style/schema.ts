import { NormalizedFractionSchema } from '@retikz/foundation';
import { enum as zodEnum, strictObject, union } from 'zod';

import { BlendMode, DropShadowSchema, ShadowPreset } from '../effects';
import { PaintSchema } from '../paint';
import { StrokeStyleSchema } from '../stroke';
import { CssColorSchema, OpacitySchema } from './primitives';

/** 校验精确 CSS 颜色或基于有效主色计算的归一化权重 */
export const ContextualColorSchema = union([CssColorSchema, NormalizedFractionSchema]).describe(
  'Contextual color: an exact CSS color string or a normalized weight derived from the effective master color.',
);

/** 校验上下文颜色或结构化渐变、图案填充 */
export const PaintValueSchema = union([ContextualColorSchema, PaintSchema]).describe(
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

/** 校验描边颜色 */
export const GraphicStrokeSchema = strictObject({
  stroke: PaintValueSchema.optional().describe('Stroke paint for primary geometry: contextual color or IRPaint.'),
}).describe('Stroke paint for primary geometry.');

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
  shadow: union([zodEnum(ShadowPreset), DropShadowSchema])
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
  strokeWidth: StrokeStyleSchema.shape.strokeWidth,
  ...GraphicEffectsSchema.shape,
}).describe('Graphic style fields for primary node / drawable geometry.');

/** 校验可向节点和路径后代级联继承的图形样式 */
export const CascadingGraphicStyleSchema = strictObject({
  ...GraphicColorSchema.shape,
  ...GraphicFillSchema.shape,
  ...GraphicStrokeSchema.shape,
  ...GraphicOpacitySchema.shape,
  strokeWidth: StrokeStyleSchema.shape.strokeWidth,
}).describe('Cascading graphic style fields shared by node and path-like elements.');
