import type { infer as ZodInfer } from 'zod';

import type { IRGraphicStyle } from '../style';
import type { DrawableInstanceSchema } from './schema';

export type IRDrawableInstance = ZodInfer<typeof DrawableInstanceSchema>;

/** 组合可绘制元素的视觉样式与绘制层级，供共享样式声明复用 */
export type IRDrawableSharedStyle = IRGraphicStyle & Pick<IRDrawableInstance, 'zIndex'>;
