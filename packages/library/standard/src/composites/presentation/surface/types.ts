import type { z } from 'zod';

import type { SurfaceInputSchema, SurfaceSchema } from './schema';

/** Surface 的公开 authoring 输入 */
export type SurfaceInput = z.input<typeof SurfaceInputSchema>;

/** 经 schema 归一化的持久化 Standard Surface composite */
export type IRSurface = z.output<typeof SurfaceSchema>;
