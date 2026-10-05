import type { FC } from 'react';

import type { CellMarkerProps } from '../cell';
import { invalidCellAuthoring } from '../cell';
/** Matrix 单格的文本或唯一 drawable；同时省略表示空格 */
export type MatrixCellProps = CellMarkerProps;
/** MatrixRow 的直属格子声明 */
export const MatrixCell: FC<MatrixCellProps> = () =>
  invalidCellAuthoring('MatrixCell must be a direct child of MatrixRow.');
MatrixCell.displayName = 'MatrixCell';
