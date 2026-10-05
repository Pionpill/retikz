import type { infer as ZodInfer } from 'zod';

import type { DrawableInstanceSchema, DrawableStyleSchema } from './schema';

export type IRDrawableStyle = ZodInfer<typeof DrawableStyleSchema>;

export type IRDrawableInstance = ZodInfer<typeof DrawableInstanceSchema>;

/** 组合可绘制元素的视觉样式与绘制层级，供共享样式声明复用 */
export type IRDrawableSharedStyle = IRDrawableStyle & Pick<IRDrawableInstance, 'zIndex'>;
