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
  type: literal('coordinate'),
  id: NonBlankStringSchema.describe('Unique reference name for this coordinate.'),
  position: union([PositionSchema, PolarPositionSchema, AtPositionSchema, OffsetPositionSchema, BetweenPositionSchema]),
}).describe(
  'Defines a named point without drawing anything. Use it as a path target or an anchor for relative positioning.',
);

/** Coordinate IR 类型 `{ type:'coordinate', id, position }` */
export type IRCoordinate = ZodInfer<typeof CoordinateSchema>;
