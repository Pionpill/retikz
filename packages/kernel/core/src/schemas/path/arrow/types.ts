import type { infer as ZodInfer } from 'zod';

import type { ArrowDetailSchema, ArrowEndDetailSchema, ArrowShapeSchema } from './schema';

/** 端点级箭头视觉规格 */
export type IRArrowEndDetail = ZodInfer<typeof ArrowEndDetailSchema>;

/** Path 级箭头详细配置 */
export type IRArrowDetail = ZodInfer<typeof ArrowDetailSchema>;

/**
 * 箭头形状名：开放字符串
 * @description 经 `CompileOptions.arrows` 注册的 provider 名；未注册名称在编译期报错
 */
export type ArrowShapeValue = ZodInfer<typeof ArrowShapeSchema>;
