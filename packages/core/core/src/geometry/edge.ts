import type { CompassAnchorValue } from './anchor';
import type { Position } from './point';

/** 边上比例点 `{ side, t }` 的四个 side（north/south/east/west） */
export type Side = 'north' | 'south' | 'east' | 'west';

/**
 * rect 四直边 t=0 / t=1 端点对应的角 anchor
 * @description 方向约定单一真源：north/south = 西→东（t=0 在 west 端），east/west = 北→南（t=0 在 north 端）。
 *   仅 rect 直边用两角端点；circle/ellipse 用 `edgeAngleDeg` 角度表、diamond 用过顶点折线。
 */
export const EDGE_ENDS = {
  north: ['north-west', 'north-east'],
  south: ['south-west', 'south-east'],
  east: ['north-east', 'south-east'],
  west: ['north-west', 'south-west'],
} as const satisfies Record<Side, readonly [CompassAnchorValue, CompassAnchorValue]>;

/** 线性插值 a + (b − a)·t */
export const lerpPoint = (a: Position, b: Position, t: number): Position => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/**
 * circle / ellipse 周长弧段：side 的局部参数角 θ(t)，单位度
 * @description 约定同 geometry 既有 `(cosθ, sinθ)` + y 轴向下 ⇒ east=0° / south=90° / west=180° / north=270°，
 *   顺时针为正。每条 side 是一段 90° 弧（等角插值）；三点（t=0/0.5/1）与 9-anchor 重合。
 */
export const edgeAngleDeg = (side: Side, t: number): number => {
  switch (side) {
    case 'north':
      return 225 + 90 * t;
    case 'south':
      return 135 - 90 * t;
    case 'east':
      return -45 + 90 * t;
    case 'west':
      return 225 - 90 * t;
  }
};

/**
 * diamond 过 cardinal 顶点的两段折线
 * @description t∈[0,0.5] 走 p0→vertex、t∈[0.5,1] 走 vertex→p1；t=0.5 恰落 vertex。
 *   p0/p1 为相邻边中点 anchor、vertex 为 cardinal 顶点 anchor——全落真实斜边
 */
export const polylineViaVertex = (
  p0: Position,
  vertex: Position,
  p1: Position,
  t: number,
): Position => (t <= 0.5 ? lerpPoint(p0, vertex, t * 2) : lerpPoint(vertex, p1, (t - 0.5) * 2));
