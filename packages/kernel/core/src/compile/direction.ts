import type { AtDirectionValue } from '../schemas';
import type { AnchorValue } from '../shared';

import { AtDirection } from '../schemas';
import { Anchor } from '../shared';

export type DirectionVector = readonly [number, number];

/**
 * 8 方向在屏幕坐标系里的单位向量。
 * @description 对角分量归一化，保证斜向 distance 与水平 / 垂直 distance 等长。
 */
export const DirectionVectorByAtDirection = {
  [AtDirection.Top]: [0, -1],
  [AtDirection.Bottom]: [0, 1],
  [AtDirection.Left]: [-1, 0],
  [AtDirection.Right]: [1, 0],
  [AtDirection.TopLeft]: [-Math.SQRT1_2, -Math.SQRT1_2],
  [AtDirection.TopRight]: [Math.SQRT1_2, -Math.SQRT1_2],
  [AtDirection.BottomLeft]: [-Math.SQRT1_2, Math.SQRT1_2],
  [AtDirection.BottomRight]: [Math.SQRT1_2, Math.SQRT1_2],
} as const satisfies Record<AtDirectionValue, DirectionVector>;

/** 8 方向 label position 对应的节点边界 anchor。 */
export const LabelAnchorByAtDirection = {
  [AtDirection.Top]: Anchor.Top,
  [AtDirection.Bottom]: Anchor.Bottom,
  [AtDirection.Left]: Anchor.Left,
  [AtDirection.Right]: Anchor.Right,
  [AtDirection.TopLeft]: Anchor.TopLeft,
  [AtDirection.TopRight]: Anchor.TopRight,
  [AtDirection.BottomLeft]: Anchor.BottomLeft,
  [AtDirection.BottomRight]: Anchor.BottomRight,
} as const satisfies Record<AtDirectionValue, AnchorValue>;
