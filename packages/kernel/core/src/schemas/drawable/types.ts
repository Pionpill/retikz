import type { z } from 'zod';

import type { DrawableMetaSchema, DrawableStyleSchema } from './schema';

export type IRDrawableStyle = z.infer<typeof DrawableStyleSchema>;

export type IRDrawableMeta = z.infer<typeof DrawableMetaSchema>;

export type IRDrawableSharedStyle = IRDrawableStyle & Pick<IRDrawableMeta, 'zIndex'>;
