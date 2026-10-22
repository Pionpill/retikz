import type { infer as ZodInfer } from 'zod';

import type { ArrowDetailSchema, ArrowStyleSchema, ArrowShapeSchema } from './schema';

/** 箭头形状、尺寸与视觉样式 */
export type IRArrowStyle = ZodInfer<typeof ArrowStyleSchema>;

/** Path 级箭头详细配置 */
export type IRArrowDetail = ZodInfer<typeof ArrowDetailSchema>;

/**
 * 箭头形状名：开放字符串
 * @description 经 `CompileOptions.arrows` 注册的 provider 名；未注册名称在编译期报错
 */
export type ArrowShape = ZodInfer<typeof ArrowShapeSchema>;
