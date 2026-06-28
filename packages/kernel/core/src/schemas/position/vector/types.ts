import type { z } from 'zod';

import type { Vector2Schema } from './schema';

/** 二维向量 [x, y]；与 Position 同形，但语义是方向或位移 */
export type IRVector2 = z.infer<typeof Vector2Schema>;
