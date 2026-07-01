import { lerp } from '@retikz/math';

import type { WebAnchorValue, WebSideValue } from '../shared';
import type { Position } from './point';

import { WebAnchor, WebSide } from '../shared';

export { lerp as lerpPoint } from '@retikz/math';

/** 边上比例点 `{ side, t }` 的四个 Web side（top/right/bottom/left） */
export type Side = WebSideValue;

/**
 * rect 四直边 t=0 / t=1 端点对应的角 anchor
 * @description 方向约定单一真源：top/bottom = 西→东（t=0 在 left 端），right/left = 北→南（t=0 在 top 端）。
 *   仅 rect 直边用两角端点；circle/ellipse 用 `edgeAngleDeg` 角度表、diamond 用过顶点折线。
 */
export const EDGE_ENDS = {
  [WebSide.Top]: [WebAnchor.TopLeft, WebAnchor.TopRight],
  [WebSide.Bottom]: [WebAnchor.BottomLeft, WebAnchor.BottomRight],
  [WebSide.Right]: [WebAnchor.TopRight, WebAnchor.BottomRight],
  [WebSide.Left]: [WebAnchor.TopLeft, WebAnchor.BottomLeft],
} as const satisfies Record<Side, readonly [WebAnchorValue, WebAnchorValue]>;

/**
 * circle / ellipse 周长弧段：side 的局部参数角 θ(t)，单位度
 * @description 约定同 geometry 既有 `(cosθ, sinθ)` + y 轴向下 ⇒ right=0° / bottom=90° / left=180° / top=270°，
 *   顺时针为正。每条 side 是一段 90° 弧（等角插值）；三点（t=0/0.5/1）与 9-anchor 重合。
 */
export const edgeAngleDeg = (side: Side, t: number): number => {
  switch (side) {
    case WebSide.Top:
      return 225 + 90 * t;
    case WebSide.Bottom:
      return 135 - 90 * t;
    case WebSide.Right:
      return -45 + 90 * t;
    case WebSide.Left:
      return 225 - 90 * t;
  }
};

/**
 * diamond 过 cardinal 顶点的两段折线
 * @description t∈[0,0.5] 走 p0→vertex、t∈[0.5,1] 走 vertex→p1；t=0.5 恰落 vertex。
 *   p0/p1 为相邻边中点 anchor、vertex 为 cardinal 顶点 anchor——全落真实斜边
 */
export const polylineViaVertex = (p0: Position, vertex: Position, p1: Position, t: number): Position =>
  t <= 0.5 ? lerp(p0, vertex, t * 2) : lerp(vertex, p1, (t - 0.5) * 2);
