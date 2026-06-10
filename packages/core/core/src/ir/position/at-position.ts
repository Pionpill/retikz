import { z } from 'zod';
import type { ValueOf } from '../../types';

/**
 * 节点相对方向 8 方向常量（视觉语义）
 * @description above/below=y 减/增（视觉上/下）；left/right=x 减/增；4 对角分量 1/√2 让对角距离与 distance 等长。与 TikZ positioning 的 `above of` 等对齐（TikZ y 向上 retikz y 向下，但视觉语义一致）
 */
export const AtDirection = {
  Above: 'above',
  Below: 'below',
  Left: 'left',
  Right: 'right',
  AboveLeft: 'above-left',
  AboveRight: 'above-right',
  BelowLeft: 'below-left',
  BelowRight: 'below-right',
} as const;

/** at 方向字面量类型 */
export type AtDirectionValue = ValueOf<typeof AtDirection>;

export const AtPositionSchema = z
  .object({
    direction: z
      .nativeEnum(AtDirection)
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
        'Distance from the referenced node center to this node center in user units. Falls back to the TikZ `nodeDistance` compile-time context, then to 1.',
      ),
  })
  .describe(
    'Relative position: place this node at `direction` direction from `of`, `distance` away. Mirrors TikZ `[<direction>=<distance> of <id>]` from the positioning library.',
  );

/** 相对定位 IR 类型 `{ direction, of, distance? }`，与 IRPosition/PolarPosition union 平级 */
export type IRAtPosition = z.infer<typeof AtPositionSchema>;
