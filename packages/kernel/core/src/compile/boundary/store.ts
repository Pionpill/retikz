import type { CanonicalNodeShape } from '../../resolve';
import type { BoundaryState, BoundaryStore } from './types';

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
