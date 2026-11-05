import type { CanonicalNodeBoundary, CanonicalNodeShape } from '../../resolve';
import { boundaryKey } from '../../resolve';
import type { IRAnchorRef, IRBoundary, IRPosition } from '../../schemas';
import type { Side } from '../../shared';
import { evaluateAnchorReference } from './layout';
import type { BoundaryState, BoundaryStore, CompiledBoundaryGeometry } from './types';

/** 为一次编译创建独立的连接面缓存与诊断容器 */
export const createBoundaryStore = (): BoundaryStore => {
  const states = new WeakMap<object, BoundaryState>();
  const get = (shape: CanonicalNodeShape): BoundaryState => {
    let state = states.get(shape);
    if (state === undefined) {
      state = { connectionEnvelopeCache: new Map(), connectionEnvelopeWarnings: new Set() };
      states.set(shape, state);
    }
    return state;
  };
  return { get };
};

/** 单个 CompiledBoundaryGeometry 生命周期内的 anchor 坐标缓存 */
const cache = new WeakMap<CompiledBoundaryGeometry, Map<string, IRPosition>>();

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

  const result = evaluateAnchorReference(layout, anchorName, boundary, canon, state);
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

  const result = evaluateAnchorReference(layout, { side, fraction: t });
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
