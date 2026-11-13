import type { ReferenceReadKind } from '@retikz/core';

import type { WeaveNode } from './types';

/** 当前阶段的名称读取与作者节点依赖 */
export type WeaveCompileRead = Readonly<{
  /** 查询名称 */
  name: string;
  /** 消费者实际读取的结果粒度 */
  kind: ReferenceReadKind;
  /** 查询结果 */
  state: 'missing' | 'pending' | 'ready';
  /** 命中声明对应的稳定作者节点 */
  binding?: WeaveNode;
}>;
