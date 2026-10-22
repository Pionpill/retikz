import type { CenteredBox, Position } from '@retikz/math';
import { lerp, localToWorld } from '@retikz/math';

import type { Side } from '../anchor';
import { Anchor } from '../anchor';
import { EDGE_ENDS } from './edge';

/** 矩形的方位锚点和边上取点工具 */
export const rect = {
  /** 获取矩形八个方位锚点之一的位置，包含旋转；中心直接取 `[r.x, r.y]` */
  anchor: (r: CenteredBox, name: Anchor): Position => {
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    let lx = 0;
    let ly = 0;

    switch (name) {
      case Anchor.Top:
        ly = -halfH;
        break;
      case Anchor.Bottom:
        ly = halfH;
        break;
      case Anchor.Right:
        lx = halfW;
        break;
      case Anchor.Left:
        lx = -halfW;
        break;
      case Anchor.TopRight:
        lx = halfW;
        ly = -halfH;
        break;
      case Anchor.TopLeft:
        lx = -halfW;
        ly = -halfH;
        break;
      case Anchor.BottomRight:
        lx = halfW;
        ly = halfH;
        break;
      case Anchor.BottomLeft:
        lx = -halfW;
        ly = halfH;
        break;
    }

    return localToWorld(r, [lx, ly]);
  },
  /** 按 0 到 1 的比例在矩形指定边上取点，包含旋转 */
  edgePoint: (r: CenteredBox, side: Side, t: number): Position => {
    const [a, b] = EDGE_ENDS[side];
    return lerp(rect.anchor(r, a), rect.anchor(r, b), t);
  },
};
