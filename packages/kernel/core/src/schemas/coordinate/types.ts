import type { infer as ZodInfer } from 'zod';

import type { CoordinateSchema } from './schema';

/** Coordinate IR 类型 `{ type:'coordinate', id, position }` */
export type IRCoordinate = ZodInfer<typeof CoordinateSchema>;
