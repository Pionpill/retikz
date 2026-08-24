import type { infer as ZodInfer } from 'zod';

import type { OffsetPositionSchema } from './schema';

/** 偏移定位 IR 类型 `{ of, offset }`，与 IRPosition/PolarPosition/IRAtPosition union 平级 */
export type IROffsetPosition = ZodInfer<typeof OffsetPositionSchema>;
