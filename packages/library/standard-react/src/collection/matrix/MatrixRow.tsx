import type { FC, ReactNode } from 'react';

import { invalidCellAuthoring } from '../cell';

/** Matrix 行分组，不生成图元或附加布局 */
export type MatrixRowProps = { /** 当前行的 MatrixCell 声明 */ children?: ReactNode };

/** Matrix 的直属行声明 */
export const MatrixRow: FC<MatrixRowProps> = () => invalidCellAuthoring('MatrixRow must be a direct child of Matrix.');
MatrixRow.displayName = 'MatrixRow';
