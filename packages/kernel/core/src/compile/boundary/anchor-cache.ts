import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CanonicalNodeBoundary } from '../../resolve';
import { boundaryKey } from '../../resolve';
import type { IRAnchorRef, IRBoundary, IRPosition } from '../../schemas';
import type { Side } from '../../shared';
import { isAnchor } from '../../shared';
import { snapshotProviderPosition } from '../shared';
import { anchorOf, angleBoundaryOf } from './anchors';
import type { CompiledBoundaryGeometry, BoundaryState } from './types';

/** 单个 CompiledBoundaryGeometry 生命周期内的 anchor 坐标缓存 */
const cache = new WeakMap<CompiledBoundaryGeometry, Map<string, IRPosition>>();

/** 角度字符串识别规则，与文本 target parser 保持一致 */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/** 不经过 WeakMap 缓存解析命名或角度 anchor */
const evaluateNamedAnchor = (
  layout: CompiledBoundaryGeometry,
  anchorName: string,
  boundary: IRBoundary | undefined,
  canon?: CanonicalNodeBoundary,
  state?: BoundaryState,
): IRPosition => {
  if (ANGLE_RE.test(anchorName)) {
    return angleBoundaryOf(layout, Number(anchorName), boundary, true, canon, state);
  }

  return anchorOf(layout, anchorName, boundary, isAnchor(anchorName), canon, state);
};

/** 不经过 WeakMap 缓存解析视觉 shape 的边上比例点 */
const calculateEdgePoint = (layout: CompiledBoundaryGeometry, side: Side, fraction: number): IRPosition => {
  const { computeEdgePoint: edgePoint } = layout.shape.definition;
  if (!edgePoint) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `shape '${layout.shape.name}' does not support side anchors ({ side, fraction })`,
    );
  }

  if (layout.geometry.rect.width === 0 && layout.geometry.rect.height === 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `{ side, fraction } is not meaningful on a zero-size target (shape '${layout.shape.name}')`,
    );
  }

  const raw = edgePoint(layout.geometry.rect, side, fraction, layout.shape.params);

  return snapshotProviderPosition(`Shape '${layout.shape.name}' edgePoint`, raw);
};

/**
 * 不经过 WeakMap 缓存解析完整 anchor 引用
 * @description 供仍会整体平移的 provisional layout 使用，避免缓存平移前坐标
 */
export const evaluateAnchorReference = (
  layout: CompiledBoundaryGeometry,
  anchor: IRAnchorRef,
  boundary?: IRBoundary,
  canon?: CanonicalNodeBoundary,
  state?: BoundaryState,
): IRPosition => {
  if (typeof anchor === 'number') return evaluateNamedAnchor(layout, String(anchor), boundary, canon, state);
  if (typeof anchor === 'string') return evaluateNamedAnchor(layout, anchor, boundary, canon, state);
  return calculateEdgePoint(layout, anchor.side, anchor.fraction);
};

/** 取命名 anchor 的全局坐标 */
export const getOrCreateNamedAnchor = (
  layout: CompiledBoundaryGeometry,
  anchorName: string,
  boundary?: IRBoundary,
  canon?: CanonicalNodeBoundary,
  state?: BoundaryState,
): IRPosition => {
  let layoutCache = cache.get(layout);
  if (!layoutCache) {
    layoutCache = new Map<string, IRPosition>();
    cache.set(layout, layoutCache);
  }

  const key = `${boundaryKey(boundary)} ${anchorName}`;
  const cached = layoutCache.get(key);
  if (cached !== undefined) return cached;

  const result = evaluateNamedAnchor(layout, anchorName, boundary, canon, state);
  layoutCache.set(key, result);

  return result;
};

/** 取视觉形状边上比例点的全局坐标 */
const getOrCreateEdgePoint = (layout: CompiledBoundaryGeometry, side: Side, t: number): IRPosition => {
  let layoutCache = cache.get(layout);
  if (!layoutCache) {
    layoutCache = new Map<string, IRPosition>();
    cache.set(layout, layoutCache);
  }

  const key = `${side}:${t}`;
  const cached = layoutCache.get(key);
  if (cached !== undefined) return cached;

  const result = calculateEdgePoint(layout, side, t);
  layoutCache.set(key, result);

  return result;
};

/** 使用既有 WeakMap 缓存解析完整 anchor 引用 */
export const getOrCreateAnchorReference = (
  layout: CompiledBoundaryGeometry,
  anchor: IRAnchorRef,
  boundary?: IRBoundary,
  canon?: CanonicalNodeBoundary,
  state?: BoundaryState,
): IRPosition => {
  if (typeof anchor === 'number') return getOrCreateNamedAnchor(layout, String(anchor), boundary, canon, state);
  if (typeof anchor === 'string') return getOrCreateNamedAnchor(layout, anchor, boundary, canon, state);
  return getOrCreateEdgePoint(layout, anchor.side, anchor.fraction);
};
