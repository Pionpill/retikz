import { z } from 'zod';
import {
  AtPositionSchema,
  PolarPositionSchema,
  PositionSchema,
} from './position';

/**
 * Coordinate（占位节点）——TikZ `\coordinate (m) at (3,2);` 同义。
 *
 * 命名一个点供后续 path / at 引用，自身不绘制任何图形。
 * 支持笛卡尔 / 极坐标 / 相对定位三种 position 形态，与 `Node.position` 完全一致。
 *
 * 特点：
 * - 必须有 `id`（无 id 的占位节点没有意义）
 * - 不参与 viewBox 扩展（无视觉边界）；只在被引用时才间接影响 viewBox（通过引用它的 node / path）
 * - 与 Node 在同一个 nodeIndex 中注册——path target 字符串、`Node.position.of` 都能命中 coordinate id
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
      .union([PositionSchema, PolarPositionSchema, AtPositionSchema])
      .describe(
        'Coordinate position; Cartesian [x, y], polar, or relative-to-another-node (`at`-style). Resolved at compile time.',
      ),
  })
  .describe(
    'Coordinate placeholder: a named point with no visual; usable as a target for paths and as an anchor for relative positioning. Mirrors TikZ `\\coordinate (id) at (...);`',
  );

/** Coordinate IR 类型——`{ type: 'coordinate', id, position }` */
export type IRCoordinate = z.infer<typeof CoordinateSchema>;
