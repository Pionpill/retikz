import type { z } from 'zod';

import type { ClipSpecSchema } from './schema';

/** 裁剪区 IR 类型（4 形状判别 union） */
export type IRClipSpec = z.infer<typeof ClipSpecSchema>;
