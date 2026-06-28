import type { z } from 'zod';

import type { CoordinateSchema } from './schema';

/** Coordinate IR 类型 `{ type:'coordinate', id, position }` */
export type IRCoordinate = z.infer<typeof CoordinateSchema>;
