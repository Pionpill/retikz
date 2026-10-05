import type { IRBranch, IRBranchDiagram, IRBranchNode } from '@retikz/diagram/branch';

/** Branch 节点的作者输入 */
export type InputBranchNode = IRBranchNode;
/** Branch 有序路径的作者输入 */
export type InputBranch = IRBranch;
/** 省略固定判别字段的 Branch Diagram 作者输入 */
export type InputBranchDiagram = Omit<IRBranchDiagram, 'namespace' | 'type'>;
