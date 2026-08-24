import type { infer as ZodInfer } from 'zod';

import type { PolarPositionSchema } from './schema';

/** 极坐标位置 IR 类型 */
export type PolarPosition = ZodInfer<typeof PolarPositionSchema>;
