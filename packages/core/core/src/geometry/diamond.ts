import { type Side, polylineViaVertex } from './edge';
import { localToWorld, worldToLocal } from './transform';
import type { CompassAnchorValue } from './anchor';
import type { Position } from './point';

/** 每条 side 的过顶点折线三 anchor：[邻边中点, cardinal 顶点, 邻边中点]（方向 north/south=西→东、east/west=北→南） */
const DIAMOND_EDGE = {
  north: ['north-west', 'north', 'north-east'],
  south: ['south-west', 'south', 'south-east'],
  east: ['north-east', 'east', 'south-east'],
  west: ['north-west', 'west', 'south-west'],
} as const satisfies Record<Side, readonly [CompassAnchorValue, CompassAnchorValue, CompassAnchorValue]>;

/** 菱形：中心 + halfA/halfB 半轴长 + 可选旋转；顶点在 (±halfA,0) 与 (0,±halfB) */
export type Diamond = {
  x: number;
  y: number;
  /** 中心到 east/west 顶点距离 */
  halfA: number;
  /** 中心到 north/south 顶点距离 */
  halfB: number;
  /** 绕中心旋转弧度 */
  rotate?: number;
};

/** 菱形相关基础工具 */
export const diamond = {
  /** 中心 */
  center: (d: Diamond): Position => [d.x, d.y],
  /** 点是否在菱形内（含边界，含旋转）；方程 |x|/halfA + |y|/halfB ≤ 1 */
  contains: (d: Diamond, p: Position): boolean => {
    if (d.halfA === 0 || d.halfB === 0) return false; // 退化菱形（零半轴）：避免除零产 NaN
    const [lx, ly] = worldToLocal(d, p);
    return Math.abs(lx) / d.halfA + Math.abs(ly) / d.halfB <= 1 + 1e-9;
  },
  /** 9 个 anchor：N/S/E/W=顶点，NE/NW/SE/SW=边中点，center=中心 */
  anchor: (d: Diamond, name: CompassAnchorValue): Position => {
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
 * 从中心向 toward 方向射线与菱形 4 边的交点
 * @description 菱形方程 |x|/halfA + |y|/halfB = 1；沿方向 (lx,ly) 缩放 t 倍命中：t = 1 / (|lx|/halfA + |ly|/halfB)
 */
  boundaryPoint: (d: Diamond, toward: Position): Position => {
    if (d.halfA === 0 || d.halfB === 0) return [d.x, d.y]; // 退化菱形（零半轴）：边界塌缩到中心，避免除零产 NaN
    const [lx, ly] = worldToLocal(d, toward);
    const denom = Math.abs(lx) / d.halfA + Math.abs(ly) / d.halfB;
    if (denom === 0) return [d.x, d.y];
    const t = 1 / denom;
    return localToWorld(d, [lx * t, ly * t]);
  },
  /** 边上比例点：side 过 cardinal 顶点的两段折线 t∈[0,1] 处（落真实斜边；含旋转） */
  edgePoint: (d: Diamond, side: Side, t: number): Position => {
    const [mid0, vertex, mid1] = DIAMOND_EDGE[side];
    return polylineViaVertex(
      diamond.anchor(d, mid0),
      diamond.anchor(d, vertex),
      diamond.anchor(d, mid1),
      t,
    );
  },
};
