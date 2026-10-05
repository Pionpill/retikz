import type { infer as ZodInfer } from 'zod';

import type { GroupCaptionDirectionSchema, GroupCaptionSchema, GroupCaptionTextSchema, GroupSchema } from './schema';

/** Group caption 文本项 */
export type IRGroupCaptionText = ZodInfer<typeof GroupCaptionTextSchema>;

/** Group caption 排列方向 */
export type GroupCaptionDirection = ZodInfer<typeof GroupCaptionDirectionSchema>;

/** Group 结构化 caption */
export type IRGroupCaption = ZodInfer<typeof GroupCaptionSchema>;

/** 可 JSON 序列化的图分组组合节点输入 */
export type IRGroup = ZodInfer<typeof GroupSchema>;
