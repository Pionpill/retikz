import type { IRListCell } from '@retikz/standard/container';
import type { FC } from 'react';

import type { CellMarkerProps } from '../cell';
import { invalidCellAuthoring } from '../cell';

/** List 单元格的文本或 drawable 输入，以及单格外观 */
export type ListItemProps = CellMarkerProps<IRListCell['layout']>;

/** List 的直属单元格声明，不单独生成图元 */
export const ListItem: FC<ListItemProps> = () => invalidCellAuthoring('ListItem must be a direct child of List.');
ListItem.displayName = 'ListItem';
