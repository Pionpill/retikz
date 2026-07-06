import type { Position } from '@retikz/math';

import type { IRBoundary, IRPosition } from '../../schemas';
import type { SideValue } from '../../shared';
import type { NodeLayout } from '../node';

import { isAnchor } from '../../shared';
import { anchorOf, angleBoundaryOf, boundaryKey, outerRectOf } from '../node';

/** 单个 NodeLayout 生命周期内的 anchor 坐标缓存。 */
const cache = new WeakMap<NodeLayout, Map<string, IRPosition>>();

/** 角度字符串识别：可选负号 + 数字 + 可选小数；与 parseTarget.ts 的 ANGLE_RE 同语义 */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/** 把 layout 的 rect 换成外边界 AABB（外扩 margin）——border 类 anchor（标准方位 / 数字角度）在其上解析 */
const withOuterRect = (layout: NodeLayout): NodeLayout => ({
  ...layout,
  rect: outerRectOf(layout),
});

/** 把 anchor 名称解析为节点上的全局坐标。 */
const computeAnchor = (layout: NodeLayout, anchorName: string, boundary: IRBoundary | undefined): IRPosition => {
  if (ANGLE_RE.test(anchorName)) {
    const angle = Number(anchorName);
    return positionToIR(angleBoundaryOf(withOuterRect(layout), angle, boundary));
  }
  if (isAnchor(anchorName)) {
    return positionToIR(anchorOf(withOuterRect(layout), anchorName, boundary));
  }
  // 形状专属命名 anchor：anchorOf 走 layout.shapeDef.anchor(rect, name)，shape 不认识的名字返回 undefined → 抛 Unknown anchor。
  // 恒走视觉 rect（不外扩）；调用方（parseNodeRef）通常已先按标准方位 anchor 集合校验内置 anchor 名合法性
  return positionToIR(anchorOf(layout, anchorName, boundary));
};

/** geometry Position（含 readonly 形态）转 IRPosition 元组（IRPosition === [number, number]） */
const positionToIR = (p: Position): IRPosition => [p[0], p[1]];

/** 取节点 anchor 的全局坐标。 */
export const resolveAnchor = (
  layout: NodeLayout,
  anchorName: string,
  boundary: IRBoundary | undefined = 'shape',
): IRPosition => {
  let layoutCache = cache.get(layout);
  if (!layoutCache) {
    layoutCache = new Map<string, IRPosition>();
    cache.set(layout, layoutCache);
  }
  const key = `${boundaryKey(boundary)} ${anchorName}`;
  const cached = layoutCache.get(key);
  if (cached !== undefined) return cached;
  const result = computeAnchor(layout, anchorName, boundary);
  layoutCache.set(key, result);
  return result;
};

/** 取节点边上比例点的全局坐标。 */
export const resolveEdgePoint = (layout: NodeLayout, side: SideValue, t: number): IRPosition => {
  const { edgePoint } = layout.shapeDef;
  if (!edgePoint) {
    throw new Error(`shape '${layout.shapeName}' does not support side anchors ({ side, fraction })`);
  }
  if (layout.rect.width === 0 && layout.rect.height === 0) {
    throw new Error(`{ side, fraction } is not meaningful on a zero-size Coordinate (shape '${layout.shapeName}')`);
  }
  let layoutCache = cache.get(layout);
  if (!layoutCache) {
    layoutCache = new Map<string, IRPosition>();
    cache.set(layout, layoutCache);
  }
  const key = `${side}:${t}`;
  const cached = layoutCache.get(key);
  if (cached !== undefined) return cached;
  const result = positionToIR(edgePoint(layout.rect, side, t, layout.shapeParams ?? {}));
  layoutCache.set(key, result);
  return result;
};
