import { NonBlankStringSchema } from '@retikz/foundation';
import { strictObject, literal, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { AtPositionSchema } from '../position/at';
import { BetweenPositionSchema } from '../position/between';
import { OffsetPositionSchema } from '../position/offset';
import { PolarPositionSchema } from '../position/polar';
import { PositionSchema } from '../position/position';

/** 校验可被路径和相对定位引用、但不产生视觉图元的命名坐标 */
export const CoordinateSchema = strictObject({
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
}).describe(
  'Coordinate placeholder: a named point with no visual, usable as a path target or relative-position anchor.',
);

/** Coordinate IR 类型 `{ type:'coordinate', id, position }` */
export type IRCoordinate = ZodInfer<typeof CoordinateSchema>;
