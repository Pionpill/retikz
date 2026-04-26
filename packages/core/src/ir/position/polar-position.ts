import { z } from 'zod';
import type { PolarPosition } from '../../geometry/polar';
import { PositionSchema } from './position';

/**
 * 极坐标点 schema（递归——origin 可嵌套）。
 * 用 z.lazy 处理自引用；TS 类型从 geometry/polar 导入并 cast 到 schema。
 */
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
        .describe('Angle in degrees, counter-clockwise positive (TikZ convention)'),
      radius: z
        .number()
        .describe('Radius / distance in user units'),
    })
    .describe(
      'Polar coordinate position; resolved to Cartesian at Scene compile time',
    ),
);

// 重新导出类型，让 ir/ 内部模块从同一处取
export type { PolarPosition } from '../../geometry/polar';
