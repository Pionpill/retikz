import type { InputBranchNode } from '@retikz/diagram-vanilla/branch';
import type { FC } from 'react';

/** Branch 节点声明属性 */
export type BranchNodeProps = InputBranchNode;
/** 声明一个共享节点；位置由 Branch 布局决定 */
export const BranchNode: FC<BranchNodeProps> = () => null;
BranchNode.displayName = 'BranchNode';
