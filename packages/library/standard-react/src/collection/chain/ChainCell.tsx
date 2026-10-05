import type { FC } from 'react';

import type { CellMarkerProps } from '../cell';
import { invalidCellAuthoring } from '../cell';

/** 链单元的文本或唯一 drawable */
export type ChainCellProps = CellMarkerProps;

/** Chain 或 ChainBranch 的直属单元 */
export const ChainCell: FC<ChainCellProps> = () =>
  invalidCellAuthoring('ChainCell must be a direct child of Chain or ChainBranch.');
ChainCell.displayName = 'ChainCell';
