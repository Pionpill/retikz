import type { CompiledNodeLayout, NodeBoundaryState } from './types';

/** 编译调用持有的节点连接边界上下文，不进入布局结果 */
export type NodeBoundaryStore = {
  /** 读取节点消费状态；布局投影按共享的 shape 解析对象关联 */
  get: (layout: CompiledNodeLayout) => NodeBoundaryState;
};

/** 为一次编译创建独立的连接面缓存与诊断容器 */
export const createNodeBoundaryStore = (): NodeBoundaryStore => {
  const states = new WeakMap<object, NodeBoundaryState>();
  const get = (layout: CompiledNodeLayout): NodeBoundaryState => {
    const key = layout.shape;
    let state = states.get(key);
    if (state === undefined) {
      state = { connectionEnvelopeCache: new Map(), connectionEnvelopeWarnings: new Set() };
      states.set(key, state);
    }
    return state;
  };
  return { get };
};
