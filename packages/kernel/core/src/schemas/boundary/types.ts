import type { infer as ZodInfer } from 'zod';

import type { BoundarySchema } from './schema';

/** 连接面引用，支持内置名称、自定义 boundary 或 shape 名称，以及带参数的引用 */
export type IRBoundary = ZodInfer<typeof BoundarySchema>;
