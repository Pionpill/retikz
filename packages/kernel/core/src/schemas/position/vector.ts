import { z } from 'zod';
import type { Vector2 } from '../../geometry/point';

export const Vector2Schema: z.ZodType<Vector2> = z
  .tuple([z.number().finite(), z.number().finite()])
  .describe('Cartesian 2D vector [x, y]; shares the same tuple shape as Position but means direction or offset.');

/** 二维向量 [x, y]；与 Position 同形，但语义是方向或位移 */
export type IRVector2 = z.infer<typeof Vector2Schema>;
