import type { FC, ReactNode } from 'react';

import { invalidCellAuthoring } from '../cell';

/** 一条有序支路 */
export type ChainBranchProps = {
  /** 单元与嵌套并行块 */
  children?: ReactNode;
};

/** 并行块的直属支路 */
export const ChainBranch: FC<ChainBranchProps> = () =>
  invalidCellAuthoring('ChainBranch must be a direct child of ChainParallel.');
ChainBranch.displayName = 'ChainBranch';
