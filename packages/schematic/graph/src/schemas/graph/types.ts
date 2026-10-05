import type { infer as ZodInfer } from 'zod';

import type { GraphSchema } from './schema';

/** 可 JSON 序列化的图根输入 */
export type IRGraph = ZodInfer<typeof GraphSchema>;
