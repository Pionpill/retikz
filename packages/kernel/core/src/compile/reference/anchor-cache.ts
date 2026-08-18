import type { Position } from '@retikz/math';

import type { BoundaryReferenceResolution, NodeReferenceView } from '../../resolve';
import type { IRAnchorRef, IRBoundary, IRPosition } from '../../schemas';
import type { SideValue } from '../../shared';
import type { NodeLayout } from '../node';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

type AnchorLayout = NodeLayout | NodeReferenceView;

import { boundaryKey } from '../../resolve';
import { isAnchor } from '../../shared';
import { anchorOf, angleBoundaryOf } from '../node';
import { snapshotProviderPosition } from '../scene-primitive';

/** 单个 NodeLayout 生命周期内的 anchor 坐标缓存 */
const cache = new WeakMap<AnchorLayout, Map<string, IRPosition>>();

/** 角度字符串识别规则，与文本 target parser 保持一致 */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/** geometry Position 转 IRPosition 元组 */
const positionToIR = (position: Position): IRPosition => [position[0], position[1]];

/** 不经过 WeakMap 缓存解析命名或角度 anchor */
const computeAnchor = (
  layout: AnchorLayout,
  anchorName: string,
  boundary: IRBoundary | undefined,
  boundaryResolution?: BoundaryReferenceResolution,
): IRPosition => {
  if (ANGLE_RE.test(anchorName)) {
    return positionToIR(angleBoundaryOf(layout, Number(anchorName), boundary, true, boundaryResolution));
  }
  return positionToIR(anchorOf(layout, anchorName, boundary, isAnchor(anchorName), boundaryResolution));
};

/** 不经过 WeakMap 缓存解析视觉 shape 的边上比例点 */
const computeEdgePoint = (layout: AnchorLayout, side: SideValue, fraction: number): IRPosition => {
  const { edgePoint } = layout.shapeDef;
  if (!edgePoint) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `shape '${layout.shapeName}' does not support side anchors ({ side, fraction })`,
    );
  }
  if (layout.rect.width === 0 && layout.rect.height === 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `{ side, fraction } is not meaningful on a zero-size target (shape '${layout.shapeName}')`,
    );
  }
  const raw = edgePoint(layout.rect, side, fraction, layout.shapeParams ?? {});
  return positionToIR(snapshotProviderPosition(`Shape '${layout.shapeName}' edgePoint`, raw));
};

/**
 * 不经过 WeakMap 缓存解析完整 anchor 引用
 * @description 供仍会整体平移的 provisional layout 使用，避免缓存平移前坐标
 */
export const resolveAnchorRefUncached = (
  layout: AnchorLayout,
  anchor: IRAnchorRef,
  boundary?: IRBoundary,
  boundaryResolution?: BoundaryReferenceResolution,
): IRPosition => {
  if (typeof anchor === 'number') return computeAnchor(layout, String(anchor), boundary, boundaryResolution);
  if (typeof anchor === 'string') return computeAnchor(layout, anchor, boundary, boundaryResolution);
  return computeEdgePoint(layout, anchor.side, anchor.fraction);
};

/** 取节点 anchor 的全局坐标 */
export const resolveAnchor = (
  layout: AnchorLayout,
  anchorName: string,
  boundary?: IRBoundary,
  boundaryResolution?: BoundaryReferenceResolution,
): IRPosition => {
  let layoutCache = cache.get(layout);
  if (!layoutCache) {
    layoutCache = new Map<string, IRPosition>();
    cache.set(layout, layoutCache);
  }
  const key = `${boundaryKey(boundary)} ${anchorName}`;
  const cached = layoutCache.get(key);
  if (cached !== undefined) return cached;
  const result = computeAnchor(layout, anchorName, boundary, boundaryResolution);
  layoutCache.set(key, result);
  return result;
};

/** 取节点边上比例点的全局坐标 */
export const resolveEdgePoint = (layout: AnchorLayout, side: SideValue, t: number): IRPosition => {
  let layoutCache = cache.get(layout);
  if (!layoutCache) {
    layoutCache = new Map<string, IRPosition>();
    cache.set(layout, layoutCache);
  }
  const key = `${side}:${t}`;
  const cached = layoutCache.get(key);
  if (cached !== undefined) return cached;
  const result = computeEdgePoint(layout, side, t);
  layoutCache.set(key, result);
  return result;
};

/** 使用既有 WeakMap 缓存解析完整 anchor 引用 */
export const resolveAnchorRef = (
  layout: AnchorLayout,
  anchor: IRAnchorRef,
  boundary?: IRBoundary,
  boundaryResolution?: BoundaryReferenceResolution,
): IRPosition => {
  if (typeof anchor === 'number') return resolveAnchor(layout, String(anchor), boundary, boundaryResolution);
  if (typeof anchor === 'string') return resolveAnchor(layout, anchor, boundary, boundaryResolution);
  return resolveEdgePoint(layout, anchor.side, anchor.fraction);
};
