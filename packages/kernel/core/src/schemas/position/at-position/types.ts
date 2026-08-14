import type { z } from 'zod';

import type { AtPositionSchema } from './schema';

/** 相对定位 IR 类型 `{ direction, of, distance? }`，与 IRPosition/PolarPosition union 平级 */
export type IRAtPosition = z.infer<typeof AtPositionSchema>;
