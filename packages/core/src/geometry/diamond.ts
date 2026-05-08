import type { Position } from './point';

/**
 * 菱形：几何中心 (x, y) + 半轴长 halfA（水平）/ halfB（垂直）+ 可选旋转。
 * 4 个顶点位于 (±halfA, 0) 与 (0, ±halfB)，4 条边界线把这些顶点两两相连。
 */
export type Diamond = {
  /** 中心横坐标 */
  x: number;
  /** 中心纵坐标 */
  y: number;
  /** 水平半轴长（中心到 east/west 顶点的距离） */
  halfA: number;
  /** 垂直半轴长（中心到 north/south 顶点的距离） */
  halfB: number;
  /** 绕几何中心旋转弧度；省略或 0 表示不旋转 */
  rotate?: number;
};

/** 菱形 9 个标准 anchor 名（4 顶点 + 4 边中点 + 中心） */
export type DiamondAnchor =
  | 'center'
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'north-east'
  | 'north-west'
  | 'south-east'
  | 'south-west';

const localToWorld = (d: Diamond, local: Position): Position => {
  const angle = d.rotate ?? 0;
  if (angle === 0) return [d.x + local[0], d.y + local[1]];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [d.x + local[0] * cos - local[1] * sin, d.y + local[0] * sin + local[1] * cos];
};

const worldToLocal = (d: Diamond, world: Position): Position => {
  const tx = world[0] - d.x;
  const ty = world[1] - d.y;
  const angle = d.rotate ?? 0;
  if (angle === 0) return [tx, ty];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [tx * cos + ty * sin, -tx * sin + ty * cos];
};

/** 菱形相关基础工具 */
export const diamond = {
  /** 中心 */
  center: (d: Diamond): Position => [d.x, d.y],
  /**
   * 判断点是否在菱形内（含边界，考虑旋转）。
   * 菱形方程：|x|/halfA + |y|/halfB ≤ 1。
   */
  contains: (d: Diamond, p: Position): boolean => {
    const [lx, ly] = worldToLocal(d, p);
    return Math.abs(lx) / d.halfA + Math.abs(ly) / d.halfB <= 1 + 1e-9;
  },
  /**
   * 9 个标准 anchor 的世界坐标。
   * - N/S/E/W：四个顶点
   * - NE/NW/SE/SW：四条边的中点
   * - center：几何中心
   */
  anchor: (d: Diamond, name: DiamondAnchor): Position => {
    let lx = 0;
    let ly = 0;
    switch (name) {
      case 'center':
        break;
      case 'north':
        ly = -d.halfB;
        break;
      case 'south':
        ly = d.halfB;
        break;
      case 'east':
        lx = d.halfA;
        break;
      case 'west':
        lx = -d.halfA;
        break;
      case 'north-east':
        lx = d.halfA / 2;
        ly = -d.halfB / 2;
        break;
      case 'north-west':
        lx = -d.halfA / 2;
        ly = -d.halfB / 2;
        break;
      case 'south-east':
        lx = d.halfA / 2;
        ly = d.halfB / 2;
        break;
      case 'south-west':
        lx = -d.halfA / 2;
        ly = d.halfB / 2;
        break;
    }
    return localToWorld(d, [lx, ly]);
  },
  /**
   * 从中心向 toward 方向画射线，求与菱形 4 条边之一的交点。
   * 菱形方程：|x|/halfA + |y|/halfB = 1。
   * 沿方向 (lx, ly) 缩放 t 倍命中：t × (|lx|/halfA + |ly|/halfB) = 1
   * → t = 1 / (|lx|/halfA + |ly|/halfB)。
   */
  boundaryPoint: (d: Diamond, toward: Position): Position => {
    const [lx, ly] = worldToLocal(d, toward);
    const denom = Math.abs(lx) / d.halfA + Math.abs(ly) / d.halfB;
    if (denom === 0) return [d.x, d.y];
    const t = 1 / denom;
    return localToWorld(d, [lx * t, ly * t]);
  },
};
