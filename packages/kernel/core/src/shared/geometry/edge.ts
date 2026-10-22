import { Anchor, Side } from '../anchor';

/**
 * 矩形每条边的起止角点
 * @description 上下两边从左到右，左右两边从上到下
 */
export const EDGE_ENDS = {
  [Side.Top]: [Anchor.TopLeft, Anchor.TopRight],
  [Side.Bottom]: [Anchor.BottomLeft, Anchor.BottomRight],
  [Side.Right]: [Anchor.TopRight, Anchor.BottomRight],
  [Side.Left]: [Anchor.TopLeft, Anchor.BottomLeft],
} as const satisfies Record<Side, readonly [Anchor, Anchor]>;

/**
 * 将椭圆某一侧的位置比例换算为角度，单位为度
 * @description t 从 0 到 1 表示从该侧起点走到终点，0.5 对应该侧正中方向
 */
export const edgeAngleDeg = (side: Side, t: number): number => {
  switch (side) {
    case Side.Top:
      return 225 + 90 * t;
    case Side.Bottom:
      return 135 - 90 * t;
    case Side.Right:
      return -45 + 90 * t;
    case Side.Left:
      return 225 - 90 * t;
  }
};
