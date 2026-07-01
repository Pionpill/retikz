import { z } from 'zod';

import type { Vector2 } from '../../../shared';

export const Vector2Schema: z.ZodType<Vector2> = z
  .tuple([z.number(), z.number()])
  .describe('Cartesian 2D vector [x, y]; shares the same tuple shape as Position but means direction or offset.');
