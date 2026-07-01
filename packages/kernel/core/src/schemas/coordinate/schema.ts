import { z } from 'zod';

import {
  AtPositionSchema,
  BetweenPositionSchema,
  OffsetPositionSchema,
  PolarPositionSchema,
  PositionSchema,
} from '../position';

export const CoordinateSchema = z
  .object({
    type: z.literal('coordinate').describe('Discriminator marking this child as a coordinate placeholder'),
    id: z
      .string()
      .min(1)
      .describe('Required unique id; the whole point of a coordinate is to be referenced by paths or other nodes'),
    position: z
      .union([PositionSchema, PolarPositionSchema, AtPositionSchema, OffsetPositionSchema, BetweenPositionSchema])
      .describe(
        'Coordinate position; Cartesian [x, y], polar, relative-to-another-node (`at`-style), offset from a base point (`{ of, offset }` form), or between two endpoints (`{ between: [A, B], t }`). Resolved at compile time.',
      ),
  })
  .strict()
  .describe(
    'Coordinate placeholder: a named point with no visual, usable as a path target or relative-position anchor.',
  );
