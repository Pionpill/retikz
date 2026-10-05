import type { InputBranch } from '@retikz/diagram-vanilla/branch';
import type { FC } from 'react';

/** 有序节点路径声明属性 */
export type BranchProps = InputBranch;
/** 声明 BranchDiagram 内一条有序路径 */
export const Branch: FC<BranchProps> = () => null;
Branch.displayName = 'Branch';
