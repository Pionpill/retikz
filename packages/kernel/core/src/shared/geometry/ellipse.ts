import { DEG_TO_RAD, localToWorld } from '@retikz/math';
import type { Ellipse, Position } from '@retikz/math';

import type { Side } from '../anchor';
import { Anchor } from '../anchor';
import { edgeAngleDeg } from './edge';

const SQRT_HALF = Math.SQRT1_2;

/** 椭圆的方位锚点和边上取点工具 */
export const ellipse = {
  /**
   * 获取椭圆八个方位锚点之一的位置，包含旋转
   * @description 斜向锚点按椭圆参数角等分选取；中心直接取 `[e.x, e.y]`
   */
  anchor: (e: Ellipse, name: Anchor): Position => {
    let lx = 0;
    let ly = 0;

    switch (name) {
      case Anchor.Top:
        ly = -e.ry;
        break;
      case Anchor.Bottom:
        ly = e.ry;
        break;
      case Anchor.Right:
        lx = e.rx;
        break;
      case Anchor.Left:
        lx = -e.rx;
        break;
      case Anchor.TopRight:
        lx = e.rx * SQRT_HALF;
        ly = -e.ry * SQRT_HALF;
        break;
      case Anchor.TopLeft:
        lx = -e.rx * SQRT_HALF;
        ly = -e.ry * SQRT_HALF;
        break;
      case Anchor.BottomRight:
        lx = e.rx * SQRT_HALF;
        ly = e.ry * SQRT_HALF;
        break;
      case Anchor.BottomLeft:
        lx = -e.rx * SQRT_HALF;
        ly = e.ry * SQRT_HALF;
        break;
    }

    return localToWorld(e, [lx, ly]);
  },
  /** 按 0 到 1 的角度比例在椭圆指定一侧取点，包含旋转 */
  edgePoint: (e: Ellipse, side: Side, t: number): Position => {
    const rad = edgeAngleDeg(side, t) * DEG_TO_RAD;
    return localToWorld(e, [e.rx * Math.cos(rad), e.ry * Math.sin(rad)]);
  },
};
