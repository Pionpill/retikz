import { localToWorld, worldToLocal } from './_transform';
import type { Position } from './point';
import type { RectAnchor } from './rect';

/** 圆形：几何中心 + 半径，预留旋转字段保持与 Rect 同形 API */
export type Circle = {
  x: number;
  y: number;
  /** 半径 */
  radius: number;
  /** 绕中心旋转弧度（圆视觉不变，与 Rect 同形保留） */
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
  /** 9 个标准 anchor 之一的世界坐标 */
  anchor: (c: Circle, name: RectAnchor): Position => {
    const r = c.radius;
    let lx = 0;
    let ly = 0;
    switch (name) {
      case 'center':
        break;
      case 'north':
        ly = -r;
        break;
      case 'south':
        ly = r;
        break;
      case 'east':
        lx = r;
        break;
      case 'west':
        lx = -r;
        break;
      case 'north-east':
        lx = r * SQRT_HALF;
        ly = -r * SQRT_HALF;
        break;
      case 'north-west':
        lx = -r * SQRT_HALF;
        ly = -r * SQRT_HALF;
        break;
      case 'south-east':
        lx = r * SQRT_HALF;
        ly = r * SQRT_HALF;
        break;
      case 'south-west':
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
};
