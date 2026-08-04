import type { z } from 'zod';

import type {
  CascadingGraphicStyleSchema,
  GraphicEffectsSchema,
  GraphicOpacitySchema,
  GraphicPaintSchema,
  GraphicStyleSchema,
  PaintValueSchema,
} from './schema';

export type IRPaintValue = z.infer<typeof PaintValueSchema>;

/** 通用图形 paint 契约 */
export type IRGraphicPaint = z.infer<typeof GraphicPaintSchema>;

/** 通用图形透明度契约 */
export type IRGraphicOpacity = z.infer<typeof GraphicOpacitySchema>;

/** 通用图形视觉效果契约 */
export type IRGraphicEffects = z.infer<typeof GraphicEffectsSchema>;

export type IRCascadingGraphicStyle = z.infer<typeof CascadingGraphicStyleSchema>;

export type IRGraphicStyle = z.infer<typeof GraphicStyleSchema>;
