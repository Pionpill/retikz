import type { Vector2 } from '@retikz/math';

import type { AnchorValue } from '../shared';

import { Anchor } from '../shared';

/**
 * 8 方向在屏幕坐标系里的单位向量。
 * @description 对角分量归一化，保证斜向 distance 与水平 / 垂直 distance 等长。
 */
export const DirectionVectorByAnchor = {
  [Anchor.Top]: [0, -1],
  [Anchor.Bottom]: [0, 1],
  [Anchor.Left]: [-1, 0],
  [Anchor.Right]: [1, 0],
  [Anchor.TopLeft]: [-Math.SQRT1_2, -Math.SQRT1_2],
  [Anchor.TopRight]: [Math.SQRT1_2, -Math.SQRT1_2],
  [Anchor.BottomLeft]: [-Math.SQRT1_2, Math.SQRT1_2],
  [Anchor.BottomRight]: [Math.SQRT1_2, Math.SQRT1_2],
} satisfies Record<AnchorValue, Vector2>;
