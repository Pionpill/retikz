import type { Position } from './point';

/** 圆形：几何中心 (x, y) + 半径；与 Rect 一样支持可选旋转（圆对自身旋转无影响，预留供 anchor 命名一致性） */
export type Circle = {
  /** 圆心横坐标 */
  x: number;
  /** 圆心纵坐标 */
  y: number;
  /** 半径（user units） */
  radius: number;
  /** 绕几何中心旋转弧度；保留与 Rect 同形 API，圆形本身旋转后视觉不变 */
  rotate?: number;
};

const SQRT_HALF = Math.SQRT1_2;

/**
 * 圆形 9 个标准 anchor 名集合，与 RECT_ANCHORS 同名同义。
 * 圆的"4 方位 + 4 对角"在圆周上等距分布（每 45°）。
 */
export type CircleAnchor =
  | 'center'
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'north-east'
  | 'north-west'
  | 'south-east'
  | 'south-west';

const localToWorld = (c: Circle, local: Position): Position => {
  const angle = c.rotate ?? 0;
  if (angle === 0) return [c.x + local[0], c.y + local[1]];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [c.x + local[0] * cos - local[1] * sin, c.y + local[0] * sin + local[1] * cos];
};

const worldToLocal = (c: Circle, world: Position): Position => {
  const tx = world[0] - c.x;
  const ty = world[1] - c.y;
  const angle = c.rotate ?? 0;
  if (angle === 0) return [tx, ty];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [tx * cos + ty * sin, -tx * sin + ty * cos];
};

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
  anchor: (c: Circle, name: CircleAnchor): Position => {
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
  /**
   * 从圆心向 toward 方向画射线，求与圆周的交点。
   * 用于把 Path 端点贴到 Node 边界。
   */
  boundaryPoint: (c: Circle, toward: Position): Position => {
    const [lx, ly] = worldToLocal(c, toward);
    const len = Math.sqrt(lx * lx + ly * ly);
    if (len === 0) return [c.x, c.y];
    const t = c.radius / len;
    return localToWorld(c, [lx * t, ly * t]);
  },
};
