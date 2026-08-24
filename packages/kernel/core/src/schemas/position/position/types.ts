import type { infer as ZodInfer } from 'zod';

import type { PositionSchema } from './schema';

/** 笛卡尔坐标 [x, y] */
export type IRPosition = ZodInfer<typeof PositionSchema>;
