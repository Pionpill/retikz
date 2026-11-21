import { NonBlankStringSchema } from '@retikz/foundation';
import { object, union, tuple, number } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { PolarPositionSchema } from './polar';
import { PositionSchema } from './position';

/** 校验从引用点、笛卡尔坐标或极坐标出发的二维偏移位置 */
export const OffsetPositionSchema = object({
  of: union([NonBlankStringSchema, PositionSchema, PolarPositionSchema]),
  offset: tuple([number(), number()]).describe('Offset [dx, dy] from the reference point in user units.'),
}).describe('Offsets a base point; a node ID refers to its center.');

/** 偏移定位 IR 类型 `{ of, offset }`，与 IRPosition/PolarPosition/IRAtPosition union 平级 */
export type IROffsetPosition = ZodInfer<typeof OffsetPositionSchema>;
