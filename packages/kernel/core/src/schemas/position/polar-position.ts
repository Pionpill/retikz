import { z } from 'zod';
import type { PolarPosition } from '../../geometry/polar';
import { PositionSchema } from './position';

/** 极坐标点 schema（递归 origin 可嵌套）；z.lazy 处理自引用，TS 类型从 geometry/polar 导入 */
export const PolarPositionSchema: z.ZodType<PolarPosition> = z.lazy(() =>
  z
    .object({
      origin: z
        .union([z.string().min(1), PositionSchema, PolarPositionSchema])
        .optional()
        .describe(
          'Origin reference: node id string, Cartesian [x, y], or nested PolarPosition (chained); defaults to [0, 0] when omitted',
        ),
      angle: z
        .number()
        .finite()
        .describe(
          'Angle in degrees, measured from +x axis (0°). 90° = +y = screen-down (visual clockwise under screen y-down); negative angles go upward. Matches retikz convention used by ArcStep / Node label.',
        ),
      radius: z
        .number()
        .finite()
        .describe('Radius / distance in user units'),
    })
    .describe(
      'Polar coordinate position; resolved to Cartesian at Scene compile time',
    ),
);

// 重导出类型让 ir/ 内部模块同处取
export type { PolarPosition } from '../../geometry/polar';
