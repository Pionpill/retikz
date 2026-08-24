import type { infer as ZodInfer } from 'zod';

import type { DrawableInstanceSchema, DrawableStyleSchema } from './schema';

export type IRDrawableStyle = ZodInfer<typeof DrawableStyleSchema>;

export type IRDrawableInstance = ZodInfer<typeof DrawableInstanceSchema>;

export type IRDrawableSharedStyle = IRDrawableStyle & Pick<IRDrawableInstance, 'zIndex'>;
