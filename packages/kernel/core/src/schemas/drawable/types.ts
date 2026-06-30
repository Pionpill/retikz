import type { z } from 'zod';

import type { DrawableInstanceSchema, DrawableStyleSchema } from './schema';

export type IRDrawableStyle = z.infer<typeof DrawableStyleSchema>;

export type IRDrawableInstance = z.infer<typeof DrawableInstanceSchema>;

export type IRDrawableSharedStyle = IRDrawableStyle & Pick<IRDrawableInstance, 'zIndex'>;
