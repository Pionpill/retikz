import { z } from 'zod';

import type { PolarPosition } from '../../../geometry/polar';

import { PositionSchema } from '../position';

/** 极坐标点 schema（递归 origin 可嵌套）；z.lazy 处理自引用，TS 类型从 geometry/polar 导入 */
export const PolarPositionSchema: z.ZodType<PolarPosition> = z.lazy(() =>
  z
    .object({
      origin: z
        .union([z.string().min(1), PositionSchema, PolarPositionSchema])
        .optional()
        .describe(
          'Origin reference: node id string, Cartesian [x, y], or nested PolarPosition. Omitted fields use [0, 0].',
        ),
      angle: z
        .number()
        .describe(
          'Angle in degrees measured from the positive x axis. Positive angles follow the screen y-down convention.',
        ),
      radius: z
        .number()
        .describe('Radius or distance in user units.'),
    })
    .describe('Polar coordinate position; resolved to Cartesian at Scene compile time'),
);
