import { z } from 'zod';
import type { ValueOf } from '../../types';

/**
 * 节点相对方向常量。8 方向（4 主向 + 4 对角），按视觉语义：
 * - above:  y 减小（视觉上方）
 * - below:  y 增大（视觉下方）
 * - left:   x 减小（视觉左方）
 * - right:  x 增大（视觉右方）
 * - 4 对角：两轴各 1/√2 单位向量分量（对角距离与 distance 等长）
 *
 * 与 TikZ `positioning` library 的 `above of` / `right of` / `above right of` 对齐
 * （TikZ y 向上、retikz y 向下，但 `above` 视觉语义在两边一致——视觉上方）。
 */
export const AT_DIRECTIONS = {
  above: 'above',
  below: 'below',
  left: 'left',
  right: 'right',
  'above-left': 'above-left',
  'above-right': 'above-right',
  'below-left': 'below-left',
  'below-right': 'below-right',
} as const;

/** at 方向字面量类型；由 `AT_DIRECTIONS` 派生 */
export type AtDirection = ValueOf<typeof AT_DIRECTIONS>;

export const AtPositionSchema = z
  .object({
    direction: z
      .nativeEnum(AT_DIRECTIONS)
      .describe(
        'Direction from the referenced node toward this node, in visual convention (above = visually upward, screen y-).',
      ),
    of: z
      .string()
      .min(1)
      .describe(
        'Id of the referenced node or coordinate; must be defined earlier in the IR (forward references rejected, mirroring polar `origin` and string targets).',
      ),
    distance: z
      .number()
      .positive()
      .optional()
      .describe(
        'Distance from the referenced node center to this node center in user units. Falls back to the Tikz `nodeDistance` compile-time context, then to 1.',
      ),
  })
  .describe(
    'Relative position: place this node at `direction` direction from `of`, `distance` away. Mirrors TikZ `[<direction>=<distance> of <id>]` from the positioning library.',
  );

/** 相对定位的 IR 类型——`{ direction, of, distance? }`，与 `IRPosition` / `PolarPosition` 在 union 里平级 */
export type IRAtPosition = z.infer<typeof AtPositionSchema>;
