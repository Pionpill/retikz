import { z } from 'zod';
import {
  AtPositionSchema,
  OffsetPositionSchema,
  PolarPositionSchema,
  PositionSchema,
} from './position';

/**
 * Coordinate 占位节点（TikZ `\coordinate (m) at (3,2);` 同义）
 * @description 命名一个点供 path/at 引用，不绘制任何图形；支持笛卡尔/极坐标/相对定位三种 position 形态。必须有 id，不参与 viewBox 扩展，与 Node 在同一 nodeIndex 注册
 */
export const CoordinateSchema = z
  .object({
    type: z
      .literal('coordinate')
      .describe('Discriminator marking this child as a coordinate placeholder'),
    id: z
      .string()
      .min(1)
      .describe(
        'Required unique id; the whole point of a coordinate is to be referenced by paths or other nodes',
      ),
    position: z
      .union([PositionSchema, PolarPositionSchema, AtPositionSchema, OffsetPositionSchema])
      .describe(
        'Coordinate position; Cartesian [x, y], polar, relative-to-another-node (`at`-style), or offset from a base point (`{ of, offset }` form). Resolved at compile time.',
      ),
  })
  .describe(
    'Coordinate placeholder: a named point with no visual; usable as a target for paths and as an anchor for relative positioning. Mirrors TikZ `\\coordinate (id) at (...);`',
  );

/** Coordinate IR 类型 `{ type:'coordinate', id, position }` */
export type IRCoordinate = z.infer<typeof CoordinateSchema>;
