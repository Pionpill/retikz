import type { z } from 'zod';
import type { BoundarySchema } from './schema';

/** 连接面引用类型（'shape' | 'circle' | 其它 shape 名 | {type, params}） */
export type IRBoundary = z.infer<typeof BoundarySchema>;
