import type { z } from 'zod';

import type { CascadingGraphicStyleSchema, GraphicStyleSchema, PaintValueSchema } from './schema';

export type IRPaintValue = z.infer<typeof PaintValueSchema>;

export type IRCascadingGraphicStyle = z.infer<typeof CascadingGraphicStyleSchema>;

export type IRGraphicStyle = z.infer<typeof GraphicStyleSchema>;
