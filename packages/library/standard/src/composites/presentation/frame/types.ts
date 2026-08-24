import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { FrameHeaderDirection } from './constants';
import type { FrameDescriptionSchema, FrameSchema, FrameTitleSchema } from './schema';

/** Frame 标题区排列方向取值 */
export type FrameHeaderDirectionValue = ValueOf<typeof FrameHeaderDirection>;

/** Frame 主标题的持久化 Node-like 输入 */
export type IRFrameTitle = ZodInfer<typeof FrameTitleSchema>;

/** 创建 Frame 主标题时接受的输入 */
export type FrameTitleInput = ZodInput<typeof FrameTitleSchema>;

/** Frame 辅助说明的持久化 Node-like 输入 */
export type IRFrameDescription = ZodInfer<typeof FrameDescriptionSchema>;

/** 创建 Frame 辅助说明时接受的输入 */
export type FrameDescriptionInput = ZodInput<typeof FrameDescriptionSchema>;

/** 持久化的 Standard Frame composite */
export type IRFrame = ZodInfer<typeof FrameSchema>;

/** 创建 Frame 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type FrameInput = Omit<ZodInput<typeof FrameSchema>, 'namespace' | 'type'>;
