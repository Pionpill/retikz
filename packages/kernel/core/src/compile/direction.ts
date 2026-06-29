import type { WebAnchorValue } from '../geometry/anchor';
import type { AtDirectionValue } from '../schemas';

import { WebAnchor } from '../geometry/anchor';
import { AtDirection } from '../schemas';

export type DirectionVector = readonly [number, number];

/**
 * 8 方向在屏幕坐标系（y 向下）里的单位向量。
 * @description above=视觉上方（y 减小）；对角分量用 1/√2，保证斜向 distance 与水平 / 垂直 distance 等长。
 */
export const DirectionVectorByAtDirection = {
  [AtDirection.Above]: [0, -1],
  [AtDirection.Below]: [0, 1],
  [AtDirection.Left]: [-1, 0],
  [AtDirection.Right]: [1, 0],
  [AtDirection.AboveLeft]: [-Math.SQRT1_2, -Math.SQRT1_2],
  [AtDirection.AboveRight]: [Math.SQRT1_2, -Math.SQRT1_2],
  [AtDirection.BelowLeft]: [-Math.SQRT1_2, Math.SQRT1_2],
  [AtDirection.BelowRight]: [Math.SQRT1_2, Math.SQRT1_2],
} as const satisfies Record<AtDirectionValue, DirectionVector>;

/** 8 方向 label position 对应的节点边界 anchor。 */
export const LabelAnchorByAtDirection = {
  [AtDirection.Above]: WebAnchor.Top,
  [AtDirection.Below]: WebAnchor.Bottom,
  [AtDirection.Left]: WebAnchor.Left,
  [AtDirection.Right]: WebAnchor.Right,
  [AtDirection.AboveLeft]: WebAnchor.TopLeft,
  [AtDirection.AboveRight]: WebAnchor.TopRight,
  [AtDirection.BelowLeft]: WebAnchor.BottomLeft,
  [AtDirection.BelowRight]: WebAnchor.BottomRight,
} as const satisfies Record<AtDirectionValue, WebAnchorValue>;
