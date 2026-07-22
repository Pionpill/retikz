import type { z } from 'zod';

import type { FrameSchema } from './schema';

/** 持久化的 Standard Frame composite */
export type IRFrame = z.infer<typeof FrameSchema>;

/** 创建 Frame 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type FrameInput = Omit<z.input<typeof FrameSchema>, 'namespace' | 'type'>;
