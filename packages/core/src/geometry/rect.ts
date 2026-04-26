import type { Position } from './point';

/** 轴对齐矩形：几何中心 (x, y) + 宽高 + 可选绕中心旋转 */
export type Rect = {
  /** 矩形几何中心横坐标 */
  x: number;
  /** 矩形几何中心纵坐标 */
  y: number;
  /** 矩形宽度（user units） */
  width: number;
  /** 矩形高度（user units） */
  height: number;
  /** 绕几何中心的旋转角（弧度）；省略或 0 表示不旋转 */
  rotate?: number;
};

/**
 * 矩形 9 个标准 anchor 名常量集合，对应 TikZ 节点的 9 个标准 anchor。
 * 与 `RectAnchor` 类型配对使用——值用 `RECT_ANCHORS.NORTH` 避免拼错，
 * 类型位置用 `RectAnchor`。
 */
export const RECT_ANCHORS = {
  /** 几何中心 */
  CENTER: 'center',
  /** 上边中点 */
  NORTH: 'north',
  /** 下边中点 */
  SOUTH: 'south',
  /** 右边中点 */
  EAST: 'east',
  /** 左边中点 */
  WEST: 'west',
  /** 右上角 */
  NORTH_EAST: 'north-east',
  /** 左上角 */
  NORTH_WEST: 'north-west',
  /** 右下角 */
  SOUTH_EAST: 'south-east',
  /** 左下角 */
  SOUTH_WEST: 'south-west',
} as const;

/** 矩形 anchor 名（与 TikZ 命名约定一致），由 `RECT_ANCHORS` 常量集合派生 */
export type RectAnchor = (typeof RECT_ANCHORS)[keyof typeof RECT_ANCHORS];

/**
 * 把"以矩形中心为原点的本地坐标"转换为世界坐标。
 * 考虑 rect.rotate（弧度）的旋转。
 */
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

/**
 * 把世界坐标转换为"以矩形中心为原点的本地坐标"。
 * 与 localToWorld 互为逆变换。
 */
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

/** 矩形相关基础工具 */
export const rect = {
  /** 矩形几何中心点 */
  center: (r: Rect): Position => [r.x, r.y],
  /** 判断点是否落在矩形范围内（含边界，考虑旋转） */
  contains: (r: Rect, p: Position): boolean => {
    const [lx, ly] = worldToLocal(r, p);
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    return lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH;
  },
  /**
   * 取矩形 9 个标准 anchor 之一的世界坐标，考虑旋转。
   * 名字与 TikZ 节点 anchor 一致（north / south / east / west / north-east / ... / center）。
   */
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
  /**
   * 从矩形中心向 toward 方向画射线，求与矩形边界的交点（考虑旋转）。
   * 用于把 Path 端点贴到 Node 边界（避免线段穿过节点内部）。
   */
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
