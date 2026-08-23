import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { PolarPositionSchema } from '../polar-position';
import { PositionSchema } from '../position';

export const OffsetPositionSchema = z
  .object({
    of: z
      .union([NonBlankStringSchema, PositionSchema, PolarPositionSchema])
      .describe('Reference base point: node id string, Cartesian [x, y], or PolarPosition.'),
    offset: z.tuple([z.number(), z.number()]).describe('Offset [dx, dy] from the reference point in user units.'),
  })
  .describe('Offset position: base point `of` plus a Cartesian offset.');
