import type { Position } from './point';

/** 轴对齐矩形：几何中心 + 宽高 + 可选绕中心旋转 */
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 绕中心旋转弧度 */
  rotate?: number;
};

/** 矩形 9 个标准 anchor 名常量（与 RectAnchor 配对，用 RECT_ANCHORS.NORTH 避免拼错） */
export const RECT_ANCHORS = {
  CENTER: 'center',
  NORTH: 'north',
  SOUTH: 'south',
  EAST: 'east',
  WEST: 'west',
  NORTH_EAST: 'north-east',
  NORTH_WEST: 'north-west',
  SOUTH_EAST: 'south-east',
  SOUTH_WEST: 'south-west',
} as const;

/** 矩形 anchor 名（与 TikZ 命名一致） */
export type RectAnchor = (typeof RECT_ANCHORS)[keyof typeof RECT_ANCHORS];

/** 本地坐标（以中心为原点）→ 世界坐标，考虑 rect.rotate */
const localToWorld = (r: Rect, local: Position): Position => {
  const angle = r.rotate ?? 0;
  if (angle === 0) return [r.x + local[0], r.y + local[1]];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    r.x + local[0] * cos - local[1] * sin,
    r.y + local[0] * sin + local[1] * cos,
  ];
};

/** 世界坐标 → 本地坐标（localToWorld 逆变换） */
const worldToLocal = (r: Rect, world: Position): Position => {
  const tx = world[0] - r.x;
  const ty = world[1] - r.y;
  const angle = r.rotate ?? 0;
  if (angle === 0) return [tx, ty];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // 逆旋转：旋转矩阵转置即逆
  return [tx * cos + ty * sin, -tx * sin + ty * cos];
};

export const rect = {
  /** 几何中心 */
  center: (r: Rect): Position => [r.x, r.y],
  /** 点是否在矩形内（含边界，含旋转） */
  contains: (r: Rect, p: Position): boolean => {
    const [lx, ly] = worldToLocal(r, p);
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    return lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH;
  },
  /** 9 个 anchor 之一的世界坐标（含旋转），TikZ 命名 */
  anchor: (r: Rect, name: RectAnchor): Position => {
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    let lx = 0;
    let ly = 0;
    switch (name) {
      case 'center':
        break;
      case 'north':
        ly = -halfH;
        break;
      case 'south':
        ly = halfH;
        break;
      case 'east':
        lx = halfW;
        break;
      case 'west':
        lx = -halfW;
        break;
      case 'north-east':
        lx = halfW;
        ly = -halfH;
        break;
      case 'north-west':
        lx = -halfW;
        ly = -halfH;
        break;
      case 'south-east':
        lx = halfW;
        ly = halfH;
        break;
      case 'south-west':
        lx = -halfW;
        ly = halfH;
        break;
    }
    return localToWorld(r, [lx, ly]);
  },
  /** 从中心向 toward 方向射线与矩形边界交点（含旋转），Path 端点贴 Node 边界用 */
  boundaryPoint: (r: Rect, toward: Position): Position => {
    const [localX, localY] = worldToLocal(r, toward);
    if (localX === 0 && localY === 0) return [r.x, r.y];
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    const tx = localX === 0 ? Infinity : halfW / Math.abs(localX);
    const ty = localY === 0 ? Infinity : halfH / Math.abs(localY);
    const t = Math.min(tx, ty);
    return localToWorld(r, [localX * t, localY * t]);
  },
};
