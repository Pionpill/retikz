import type { infer as ZodInfer } from 'zod';

import type {
  CascadingGraphicStyleSchema,
  GraphicEffectsSchema,
  GraphicOpacitySchema,
  GraphicPaintSchema,
  GraphicStyleSchema,
  PaintValueSchema,
} from './schema';

export type IRPaintValue = ZodInfer<typeof PaintValueSchema>;

/** 通用图形 paint 契约 */
export type IRGraphicPaint = ZodInfer<typeof GraphicPaintSchema>;

/** 通用图形透明度契约 */
export type IRGraphicOpacity = ZodInfer<typeof GraphicOpacitySchema>;

/** 通用图形视觉效果契约 */
export type IRGraphicEffects = ZodInfer<typeof GraphicEffectsSchema>;

export type IRCascadingGraphicStyle = ZodInfer<typeof CascadingGraphicStyleSchema>;

export type IRGraphicStyle = ZodInfer<typeof GraphicStyleSchema>;
