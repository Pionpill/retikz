import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { FrameHeaderDirection } from './constants';
import type { FrameDescriptionSchema, FrameTitleSchema } from './header-schema';
import type { FrameSchema } from './schema';

/** Frame 标题区排列方向取值 */
export type FrameHeaderDirectionValue = ValueOf<typeof FrameHeaderDirection>;

/** Frame 主标题的持久化 Node-like 输入 */
export type IRFrameTitle = z.infer<typeof FrameTitleSchema>;

/** 创建 Frame 主标题时接受的输入 */
export type FrameTitleInput = z.input<typeof FrameTitleSchema>;

/** Frame 辅助说明的持久化 Node-like 输入 */
export type IRFrameDescription = z.infer<typeof FrameDescriptionSchema>;

/** 创建 Frame 辅助说明时接受的输入 */
export type FrameDescriptionInput = z.input<typeof FrameDescriptionSchema>;

/** 持久化的 Standard Frame composite */
export type IRFrame = z.infer<typeof FrameSchema>;

/** 创建 Frame 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type FrameInput = Omit<z.input<typeof FrameSchema>, 'namespace' | 'type'>;
