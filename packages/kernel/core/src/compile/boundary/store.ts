import type { Position } from '@retikz/math';

import type { CanonicalNodeShape } from '../../resolve';
import { boundaryKey } from '../../resolve';
import { evaluateAnchorReference } from './layout';
import type { BoundaryState, BoundaryStore, CompiledBoundaryGeometry } from './types';

/** 为一次编译创建独立的连接面状态、锚点缓存与诊断容器 */
export const createBoundaryStore = (): BoundaryStore => {
  /** 本次编译按形状绑定共享的包络缓存与已派发诊断 */
  const stateMap = new WeakMap<CanonicalNodeShape, BoundaryState>();
  /** 本次编译按最终几何身份缓存锚点；投影后的新几何独立求值 */
  const anchorCache = new WeakMap<CompiledBoundaryGeometry, Map<string, Position>>();

  const getOrCreateState: BoundaryStore['getOrCreateState'] = shape => {
    let state = stateMap.get(shape);
    if (state === undefined) {
      state = { connectionEnvelopeCache: new Map(), connectionEnvelopeWarnings: new Set() };
      stateMap.set(shape, state);
    }
    return state;
  };

  const getOrCreateAnchor: BoundaryStore['getOrCreateAnchor'] = (
    layout,
    anchor,
    boundary,
    canonicalBoundary,
    context,
  ) => {
    let geometryCache = anchorCache.get(layout);
    if (geometryCache === undefined) {
      geometryCache = new Map();
      anchorCache.set(layout, geometryCache);
    }

    const key =
      typeof anchor === 'object'
        ? `edge:${anchor.side}:${anchor.fraction}`
        : JSON.stringify([boundaryKey(boundary), String(anchor)]);
    const cached = geometryCache.get(key);
    if (cached !== undefined) return cached;

    const state = getOrCreateState(layout.shape);
    const position = evaluateAnchorReference(layout, anchor, boundary, canonicalBoundary, { ...state, ...context });
    geometryCache.set(key, position);
    return position;
  };

  return { getOrCreateState, getOrCreateAnchor };
};
