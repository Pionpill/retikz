import { NonBlankStringSchema } from '@retikz/foundation';
import { object, union, lazy, number } from 'zod';
import type { ZodType, infer as ZodInfer } from 'zod';

import type { SharedPolarPosition } from '../../shared';
import { PositionSchema } from './position';

/** 校验可嵌套原点引用的极坐标；角度从正 x 轴沿屏幕坐标方向计量 */
export const PolarPositionSchema = object({
  origin: union([
    NonBlankStringSchema,
    PositionSchema,
    lazy((): ZodType<SharedPolarPosition, SharedPolarPosition> => PolarPositionSchema),
  ])
    .optional()
    .describe('Origin; defaults to [0, 0].'),
  angle: number().describe('Degrees clockwise from +x in screen coordinates.'),
  radius: number().describe('Radius or distance in user units.'),
}).describe('Polar position relative to an origin.');

/** 极坐标位置 IR 类型 */
export type PolarPosition = ZodInfer<typeof PolarPositionSchema>;
