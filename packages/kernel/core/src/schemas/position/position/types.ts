import type { z } from 'zod';

import type { PositionSchema } from './schema';

/** 笛卡尔坐标 [x, y] */
export type IRPosition = z.infer<typeof PositionSchema>;
