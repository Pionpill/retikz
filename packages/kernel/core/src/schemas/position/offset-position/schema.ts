import { NonBlankStringSchema } from '@retikz/foundation';
import { number, object, tuple, union } from 'zod';

import { PolarPositionSchema } from '../polar-position';
import { PositionSchema } from '../position';

/** 校验从引用点、笛卡尔坐标或极坐标出发的二维偏移位置 */
export const OffsetPositionSchema = object({
  of: union([NonBlankStringSchema, PositionSchema, PolarPositionSchema]).describe(
    'Reference base point: node id string, Cartesian [x, y], or PolarPosition.',
  ),
  offset: tuple([number(), number()]).describe('Offset [dx, dy] from the reference point in user units.'),
}).describe('Offset position: base point `of` plus a Cartesian offset.');
