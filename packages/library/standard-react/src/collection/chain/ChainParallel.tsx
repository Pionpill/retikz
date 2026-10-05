import type { InputChainConnection } from '@retikz/standard-vanilla/collection';
import type { IRChainParallel } from '@retikz/standard/collection';
import type { FC, ReactNode } from 'react';

import { invalidCellAuthoring } from '../cell';

/** 并行块局部覆盖与直属支路 */
export type ChainParallelProps = {
  /** 排布覆盖 */ layout?: IRChainParallel['layout'];
  /** 连接覆盖 */ connection?: InputChainConnection;
  /** 支路声明 */ children?: ReactNode;
};
/** 结构化分叉与汇合 */
export const ChainParallel: FC<ChainParallelProps> = () =>
  invalidCellAuthoring('ChainParallel must be a direct child of Chain or ChainBranch.');
ChainParallel.displayName = 'ChainParallel';
