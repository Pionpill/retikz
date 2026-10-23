import { NonBlankStringSchema } from '@retikz/foundation';
import { object, union, lazy, number } from 'zod';
import type { ZodType, infer as ZodInfer } from 'zod';

import type { SharedPolarPosition } from '../../shared';
import { PositionSchema } from './position';

/** 校验可嵌套原点引用的极坐标；角度从正 x 轴沿屏幕坐标方向计量 */
export const PolarPositionSchema = object({
  origin: union([NonBlankStringSchema, PositionSchema, lazy((): ZodType<SharedPolarPosition> => PolarPositionSchema)])
    .optional()
    .describe(
      'Origin reference: node id string, Cartesian [x, y], or nested PolarPosition. Omitted fields use [0, 0].',
    ),
  angle: number().describe(
    'Angle in degrees measured from the positive x axis. Positive angles follow the screen y-down convention.',
  ),
  radius: number().describe('Radius or distance in user units.'),
}).describe('Polar coordinate position; resolved to Cartesian at Scene compile time');

/** 极坐标位置 IR 类型 */
export type PolarPosition = ZodInfer<typeof PolarPositionSchema>;
