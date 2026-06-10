import { localToWorld, worldToLocal } from './_transform';
import { EDGE_ENDS, type Side, lerpPoint } from './_edge';
import type { CompassAnchorValue } from './anchor';
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
  /** 9 个标准方位 anchor 之一的世界坐标（含旋转），TikZ 命名 */
  anchor: (r: Rect, name: CompassAnchorValue): Position => {
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
  /** 边上比例点：side 直边 t∈[0,1] 处（两角 anchor 线性插值，含旋转）；方向见 EDGE_ENDS */
  edgePoint: (r: Rect, side: Side, t: number): Position => {
    const [a, b] = EDGE_ENDS[side];
    return lerpPoint(rect.anchor(r, a), rect.anchor(r, b), t);
  },
};

/** rectOutline 的命令算子（供 compile 翻译为 PathCommand；几何在 core 下沉，便于未来 rectangle node shape 复用） */
export type RectOutlineOp =
  | { kind: 'move'; to: Position }
  | { kind: 'line'; to: Position }
  | { kind: 'arc'; center: Position; radius: number; startAngle: number; endAngle: number }
  | { kind: 'close' };

/**
 * 矩形 outline：两对角 → 顺时针 path 算子序列
 * @description from/to 任意顺序，归一化 (x0,y0)=min、(x1,y1)=max。直角 = 4 line + close（起点左上 (x0,y0)）；
 *   圆角 = 4 line + 4 quarter-arc + close（起点 (x0+r, y0)）。cornerRadius clamp 到 min(w,h)/2。
 *   角度约定同 geometry/arc（y-down：0=+x, 90=+y/下, 180=-x, 270=-y/上）。
 */
export const rectOutline = (
  from: Position,
  to: Position,
  cornerRadius?: number,
): Array<RectOutlineOp> => {
  const x0 = Math.min(from[0], to[0]);
  const x1 = Math.max(from[0], to[0]);
  const y0 = Math.min(from[1], to[1]);
  const y1 = Math.max(from[1], to[1]);
  const r =
    cornerRadius === undefined
      ? 0
      : Math.min(cornerRadius, (x1 - x0) / 2, (y1 - y0) / 2);

  if (r <= 0) {
    return [
      { kind: 'move', to: [x0, y0] },
      { kind: 'line', to: [x1, y0] },
      { kind: 'line', to: [x1, y1] },
      { kind: 'line', to: [x0, y1] },
      { kind: 'close' },
    ];
  }

  return [
    { kind: 'move', to: [x0 + r, y0] },
    { kind: 'line', to: [x1 - r, y0] },
    { kind: 'arc', center: [x1 - r, y0 + r], radius: r, startAngle: 270, endAngle: 360 },
    { kind: 'line', to: [x1, y1 - r] },
    { kind: 'arc', center: [x1 - r, y1 - r], radius: r, startAngle: 0, endAngle: 90 },
    { kind: 'line', to: [x0 + r, y1] },
    { kind: 'arc', center: [x0 + r, y1 - r], radius: r, startAngle: 90, endAngle: 180 },
    { kind: 'line', to: [x0, y0 + r] },
    { kind: 'arc', center: [x0 + r, y0 + r], radius: r, startAngle: 180, endAngle: 270 },
    { kind: 'close' },
  ];
};
