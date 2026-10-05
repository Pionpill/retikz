import type { IRArrayCell } from '@retikz/standard/collection';
import type { FC } from 'react';

import type { CellMarkerProps } from '../cell';
import { invalidCellAuthoring } from '../cell';

/**
 * Array 单元格的文本或 drawable 输入，以及单格外观
 * @description text 与 children 互斥；同时省略表示空格，提供 children 时必须产生恰好一个图形。id 标识单元格边框区域，style 与 layout 覆盖 Array 的对应设置
 */
export type ArrayItemProps = CellMarkerProps<IRArrayCell['layout']>;

/** Array 的直属单元格声明，不单独生成图元 */
export const ArrayItem: FC<ArrayItemProps> = () => invalidCellAuthoring('ArrayItem must be a direct child of Array.');
ArrayItem.displayName = 'ArrayItem';
