import type { Vector2 } from '@retikz/math';

import type { AnchorValue, CornerValue, SideValue } from './types';

import { Corner, Side } from './constants';

export const SideValues = [Side.Top, Side.Right, Side.Bottom, Side.Left] as const satisfies Readonly<Array<SideValue>>;

export const CornerValues = [
  Corner.TopRight,
  Corner.TopLeft,
  Corner.BottomRight,
  Corner.BottomLeft,
] as const satisfies Readonly<Array<CornerValue>>;

export const AnchorValues = [...SideValues, ...CornerValues] as const satisfies Readonly<Array<AnchorValue>>;

/**
 * 标准方向 anchor 在屏幕坐标系里的单位向量。
 * @description 对角分量归一化，保证斜向 distance 与水平 / 垂直 distance 等长。
 */
export const AnchorUnitVectorByAnchor = {
  [Side.Top]: [0, -1],
  [Side.Bottom]: [0, 1],
  [Side.Left]: [-1, 0],
  [Side.Right]: [1, 0],
  [Corner.TopLeft]: [-Math.SQRT1_2, -Math.SQRT1_2],
  [Corner.TopRight]: [Math.SQRT1_2, -Math.SQRT1_2],
  [Corner.BottomLeft]: [-Math.SQRT1_2, Math.SQRT1_2],
  [Corner.BottomRight]: [Math.SQRT1_2, Math.SQRT1_2],
} satisfies Record<AnchorValue, Vector2>;
