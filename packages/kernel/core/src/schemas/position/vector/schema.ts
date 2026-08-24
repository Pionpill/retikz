import type { Vector2 } from '@retikz/math';
import type { ZodType } from 'zod';

import { number, tuple } from 'zod';

export const Vector2Schema: ZodType<Vector2> = tuple([number(), number()]).describe(
  'Cartesian 2D vector [x, y]; shares the same tuple shape as Position but means direction or offset.',
);
