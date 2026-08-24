import { NonBlankStringSchema } from '@retikz/foundation';
import { literal, object, union } from 'zod';

import {
  AtPositionSchema,
  BetweenPositionSchema,
  OffsetPositionSchema,
  PolarPositionSchema,
  PositionSchema,
} from '../position';

export const CoordinateSchema = object({
  type: literal('coordinate').describe('Discriminator marking this child as a coordinate placeholder'),
  id: NonBlankStringSchema.describe(
    'Required unique id; the whole point of a coordinate is to be referenced by paths or other nodes',
  ),
  position: union([
    PositionSchema,
    PolarPositionSchema,
    AtPositionSchema,
    OffsetPositionSchema,
    BetweenPositionSchema,
  ]).describe('Coordinate position. Supports Cartesian, polar, at-position, offset, and between-position forms.'),
})
  .strict()
  .describe(
    'Coordinate placeholder: a named point with no visual, usable as a path target or relative-position anchor.',
  );
