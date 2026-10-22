import type { infer as ZodInfer } from 'zod';

import type {
  StrokeDashPatternSchema,
  StrokeCapJoinSchema,
  CascadingGraphicStyleSchema,
  ContextualColorSchema,
  GraphicEffectsSchema,
  GraphicOpacitySchema,
  GraphicPaintSchema,
  GraphicStyleSchema,
  PaintValueSchema,
  GraphicColorSchema,
  GraphicElementOpacitySchema,
  GraphicFillSchema,
  GraphicStrokeSchema,
} from './schema';

/** 精确 CSS 颜色或从有效主色派生的归一化权重 */
export type IRContextualColor = ZodInfer<typeof ContextualColorSchema>;

/** 用于填充或描边的上下文颜色或结构化绘制资源 */
export type IRPaintValue = ZodInfer<typeof PaintValueSchema>;

/** 通用图形 paint 契约 */
export type IRGraphicPaint = ZodInfer<typeof GraphicPaintSchema>;

/** 通用图形透明度契约 */
export type IRGraphicOpacity = ZodInfer<typeof GraphicOpacitySchema>;

/** 通用图形视觉效果契约 */
export type IRGraphicEffects = ZodInfer<typeof GraphicEffectsSchema>;

/** 可向节点和路径后代级联继承的图形样式 */
export type IRCascadingGraphicStyle = ZodInfer<typeof CascadingGraphicStyleSchema>;

/** 主体几何的主色、填充、描边、透明度与视觉效果 */
export type IRGraphicStyle = ZodInfer<typeof GraphicStyleSchema>;

/** 供主体几何及其装饰派生颜色的主色配置 */
export type IRGraphicColor = ZodInfer<typeof GraphicColorSchema>;

/** 作用于整个主体几何的标量透明度配置 */
export type IRGraphicElementOpacity = ZodInfer<typeof GraphicElementOpacitySchema>;

/** 主体几何的填充绘制配置 */
export type IRGraphicFill = ZodInfer<typeof GraphicFillSchema>;

/** 主体几何的描边绘制、线宽、虚线、端帽与连接样式 */
export type IRGraphicStroke = ZodInfer<typeof GraphicStrokeSchema>;

/** 描边 dash / gap 长度序列 */
export type StrokeDashPattern = ZodInfer<typeof StrokeDashPatternSchema>;

/** 描边端点的线帽与拐角连接样式 */
export type IRStrokeCapJoin = ZodInfer<typeof StrokeCapJoinSchema>;
