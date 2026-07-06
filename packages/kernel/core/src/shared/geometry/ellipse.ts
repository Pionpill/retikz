import type { Ellipse, Position } from '@retikz/math';

import { ellipse as mathEllipse } from '@retikz/math';

import type { AnchorValue, SideValue } from '../anchor';

import { Anchor } from '../anchor';
import { DEG_TO_RAD } from './angle';
import { edgeAngleDeg } from './edge';
import { localToWorld } from './transform';

export type { Ellipse };

const SQRT_HALF = Math.SQRT1_2;

/** 椭圆相关基础工具 */
export const ellipse = {
  /** 中心 */
  center: mathEllipse.center,
  /** 判断点是否在椭圆内（含边界，考虑旋转） */
  contains: mathEllipse.contains,
  /**
   * 8 个标准方位 anchor 的世界坐标；center 请用 `ellipse.center()`
   * @description 对角（NE/NW/SE/SW）取参数曲线 t=π/4 处 (rx/√2, ry/√2)，与 TikZ 椭圆 anchor 参数等分约定一致
   */
  anchor: (e: Ellipse, name: AnchorValue): Position => {
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
  /**
   * 从中心向 toward 方向射线与椭圆交点
   * @description 椭圆方程 (x/rx)² + (y/ry)² = 1；沿 (lx,ly) 缩放 t 倍命中 t = 1 / √((lx/rx)² + (ly/ry)²)
   */
  boundaryPoint: mathEllipse.boundaryPoint,
  /** 边上比例点：side 的 90° 周长弧段 t∈[0,1] 处（等角，落真实椭圆周；含旋转） */
  edgePoint: (e: Ellipse, side: SideValue, t: number): Position => {
    const rad = edgeAngleDeg(side, t) * DEG_TO_RAD;
    return localToWorld(e, [e.rx * Math.cos(rad), e.ry * Math.sin(rad)]);
  },
};
