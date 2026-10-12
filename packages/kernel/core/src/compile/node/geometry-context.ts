import type { NodeReferenceView } from '../../resolve';
import type { BoundaryGeometryResolveContext, NodeLayout } from './types';

/** 连接面消费过程中的缓存和诊断状态 */
export type NodeGeometryState = Pick<
  BoundaryGeometryResolveContext,
  'connectionEnvelopeCache' | 'connectionEnvelopeWarnings' | 'warn'
>;

/** 编译调用持有的节点几何消费上下文，不进入布局结果 */
export type NodeGeometryContext = {
  /** 读取节点消费状态；布局投影按共享的 node 属性对象关联 */
  get: (layout: NodeLayout | NodeReferenceView) => NodeGeometryState;
  /** 将 resolver 引用视图关联到原节点的消费状态 */
  bind: (layout: NodeLayout, reference: NodeReferenceView) => void;
};

/** 为一次编译创建独立的连接面缓存与诊断容器 */
export const createNodeGeometryContext = (): NodeGeometryContext => {
  const states = new WeakMap<object, NodeGeometryState>();
  const get = (layout: NodeLayout | NodeReferenceView): NodeGeometryState => {
    const key = 'node' in layout ? layout.node : layout;
    let state = states.get(key);
    if (state === undefined) {
      state = { connectionEnvelopeCache: new Map(), connectionEnvelopeWarnings: new Set() };
      states.set(key, state);
    }
    return state;
  };
  return { get, bind: (layout, reference) => states.set(reference, get(layout)) };
};
