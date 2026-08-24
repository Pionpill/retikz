import { NonBlankStringSchema } from '@retikz/foundation';
import { number, object, tuple, union } from 'zod';

import { PolarPositionSchema } from '../polar-position';
import { PositionSchema } from '../position';

export const OffsetPositionSchema = object({
  of: union([NonBlankStringSchema, PositionSchema, PolarPositionSchema]).describe(
    'Reference base point: node id string, Cartesian [x, y], or PolarPosition.',
  ),
  offset: tuple([number(), number()]).describe('Offset [dx, dy] from the reference point in user units.'),
}).describe('Offset position: base point `of` plus a Cartesian offset.');
