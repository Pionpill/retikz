import type { input as ZodInput, output as ZodOutput } from 'zod';

import type { SurfaceInputSchema, SurfaceSchema } from './schema';

/** Surface 的公开 authoring 输入 */
export type SurfaceInput = ZodInput<typeof SurfaceInputSchema>;

/** 经 schema 归一化的持久化 Standard Surface composite */
export type IRSurface = ZodOutput<typeof SurfaceSchema>;
