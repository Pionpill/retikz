import type { IRListCell } from '@retikz/standard/container';
import type { FC } from 'react';

import type { CellMarkerProps } from '../cell';
import { invalidCellAuthoring } from '../cell';

/**
 * List 单元格的文本或 drawable 输入，以及单格外观
 * @description text 与 children 二选一；children 必须产生恰好一个图形。id 标识单元格边框区域，style 与 layout 覆盖 List 的对应设置
 */
export type ListItemProps = CellMarkerProps<IRListCell['layout']>;

/** List 的直属单元格声明，不单独生成图元 */
export const ListItem: FC<ListItemProps> = () => invalidCellAuthoring('ListItem must be a direct child of List.');
ListItem.displayName = 'ListItem';
