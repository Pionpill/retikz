import { CompassAnchor } from '../geometry/anchor';
import type { CompassAnchorValue } from '../geometry/anchor';
import { AtDirection } from '../ir';
import type { AtDirectionValue } from '../ir';

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
  [AtDirection.Above]: CompassAnchor.North,
  [AtDirection.Below]: CompassAnchor.South,
  [AtDirection.Left]: CompassAnchor.West,
  [AtDirection.Right]: CompassAnchor.East,
  [AtDirection.AboveLeft]: CompassAnchor.NorthWest,
  [AtDirection.AboveRight]: CompassAnchor.NorthEast,
  [AtDirection.BelowLeft]: CompassAnchor.SouthWest,
  [AtDirection.BelowRight]: CompassAnchor.SouthEast,
} as const satisfies Record<AtDirectionValue, CompassAnchorValue>;
