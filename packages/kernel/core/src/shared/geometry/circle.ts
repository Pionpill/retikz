import type { Position } from '@retikz/math';

import type { AnchorValue, SideValue } from '../anchor';

import { Anchor } from '../anchor';
import { DEG_TO_RAD } from './angle';
import { edgeAngleDeg } from './edge';
import { localToWorld, worldToLocal } from './transform';

/** 圆形：几何中心 + 半径，预留旋转字段保持与 Rect 同形 API */
export type Circle = {
  x: number;
  y: number;
  /** 半径 */
  radius: number;
  /**
   * 绕中心旋转弧度（圆视觉不变，与 Rect 同形保留）。
   * @default 0
   */
  rotate?: number;
};

const SQRT_HALF = Math.SQRT1_2;

/** 圆形相关基础工具 */
export const circle = {
  /** 圆心 */
  center: (c: Circle): Position => [c.x, c.y],
  /** 判断点是否在圆内（含边界） */
  contains: (c: Circle, p: Position): boolean => {
    const [lx, ly] = worldToLocal(c, p);
    return lx * lx + ly * ly <= c.radius * c.radius;
  },
  /** 8 个标准方位 anchor 之一的世界坐标；center 请用 `circle.center()` */
  anchor: (c: Circle, name: AnchorValue): Position => {
    const r = c.radius;
    let lx = 0;
    let ly = 0;
    switch (name) {
      case Anchor.Top:
        ly = -r;
        break;
      case Anchor.Bottom:
        ly = r;
        break;
      case Anchor.Right:
        lx = r;
        break;
      case Anchor.Left:
        lx = -r;
        break;
      case Anchor.TopRight:
        lx = r * SQRT_HALF;
        ly = -r * SQRT_HALF;
        break;
      case Anchor.TopLeft:
        lx = -r * SQRT_HALF;
        ly = -r * SQRT_HALF;
        break;
      case Anchor.BottomRight:
        lx = r * SQRT_HALF;
        ly = r * SQRT_HALF;
        break;
      case Anchor.BottomLeft:
        lx = -r * SQRT_HALF;
        ly = r * SQRT_HALF;
        break;
    }
    return localToWorld(c, [lx, ly]);
  },
  /** 从圆心向 toward 方向射线与圆周交点（Path 端点贴 Node 边界用） */
  boundaryPoint: (c: Circle, toward: Position): Position => {
    const [lx, ly] = worldToLocal(c, toward);
    const len = Math.sqrt(lx * lx + ly * ly);
    if (len === 0) return [c.x, c.y];
    const t = c.radius / len;
    return localToWorld(c, [lx * t, ly * t]);
  },
  /** 边上比例点：side 的 90° 周长弧段 t∈[0,1] 处（等角，落真实圆周；含旋转） */
  edgePoint: (c: Circle, side: SideValue, t: number): Position => {
    const rad = edgeAngleDeg(side, t) * DEG_TO_RAD;
    return localToWorld(c, [c.radius * Math.cos(rad), c.radius * Math.sin(rad)]);
  },
};
