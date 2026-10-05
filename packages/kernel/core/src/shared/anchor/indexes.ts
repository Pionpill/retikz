import type { Vector2 } from '@retikz/math';

import { Corner, Side } from './constants';
import type { Anchor } from './constants';

/** 按上、右、下、左顺序列出四边方向 */
export const SideValues = [Side.Top, Side.Right, Side.Bottom, Side.Left] as const satisfies Readonly<Array<Side>>;

/** 按右上、左上、右下、左下顺序列出四角方向 */
export const CornerValues = [
  Corner.TopRight,
  Corner.TopLeft,
  Corner.BottomRight,
  Corner.BottomLeft,
] as const satisfies Readonly<Array<Corner>>;

/** 先列四边、再列四角的八方向边界锚点集合 */
export const AnchorValues = [...SideValues, ...CornerValues] as const satisfies Readonly<Array<Anchor>>;

/**
 * 标准方向 anchor 在屏幕坐标系里的单位向量
 * @description 对角分量归一化，保证斜向 distance 与水平 / 垂直 distance 等长
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
} satisfies Record<Anchor, Vector2>;
