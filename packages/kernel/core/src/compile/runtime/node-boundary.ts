import type { PropertyPath } from '@retikz/foundation';
import type { CenteredBox } from '@retikz/math';

import type { ConnectionEnvelopeKind } from '../../contract';
import type { NodeReferenceGeometry } from '../../resolve';
import type { CompiledNodeLayout } from '../layout';
import type { CompileWarningCode } from '../shared';

/** 连接面消费过程中的缓存和诊断状态 */
export type NodeBoundaryState = {
  /** 按连接面缓存已计算的包络 */
  connectionEnvelopeCache?: Map<string, CenteredBox>;
  /** 已发布回退诊断的连接面种类 */
  connectionEnvelopeWarnings?: Set<ConnectionEnvelopeKind>;
  /** 当前节点的诊断出口 */
  warn?: (code: CompileWarningCode, message: string) => void;
  /** 当前节点的来源路径 */
  irPath?: PropertyPath;
};

/** 编译调用持有的节点连接边界上下文，不进入布局结果 */
export type NodeBoundaryStore = {
  /** 读取节点消费状态；布局投影按共享的 shape 解析对象关联 */
  get: (layout: CompiledNodeLayout | NodeReferenceGeometry) => NodeBoundaryState;
  /** 将 resolver 引用视图关联到原节点的消费状态 */
  bind: (layout: CompiledNodeLayout, reference: NodeReferenceGeometry) => void;
};

/** 为一次编译创建独立的连接面缓存与诊断容器 */
export const createNodeBoundaryStore = (): NodeBoundaryStore => {
  const states = new WeakMap<object, NodeBoundaryState>();
  const get = (layout: CompiledNodeLayout | NodeReferenceGeometry): NodeBoundaryState => {
    const key = 'geometry' in layout ? layout.shape : layout;
    let state = states.get(key);
    if (state === undefined) {
      state = { connectionEnvelopeCache: new Map(), connectionEnvelopeWarnings: new Set() };
      states.set(key, state);
    }
    return state;
  };
  return { get, bind: (layout, reference) => states.set(reference, get(layout)) };
};
