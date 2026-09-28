import type { GridLayoutItemInput } from '@retikz/layout';
import { RetikzLayoutError, RetikzLayoutErrorCode } from '@retikz/layout';
import type { FC } from 'react';

import type { LayoutItemChildSource } from './types';

/** GridLayout 直属 item 的 React authoring props */
export type GridLayoutItemProps = Omit<GridLayoutItemInput, 'child' | 'key' | 'kind'> &
  Readonly<{
    /** 容器内稳定身份；省略时内部按位置生成，不读取 React key */
    itemKey?: string;
  }> &
  LayoutItemChildSource;

/** 由 GridLayout 静态读取的直属布局子项 */
export const GridLayoutItem: FC<GridLayoutItemProps> = () => {
  throw new RetikzLayoutError({
    code: RetikzLayoutErrorCode.AuthoringInvalid,
    message: 'GridLayoutItem must be a direct child of GridLayout or InspectGridLayout',
    details: { component: 'GridLayoutItem' },
  });
};

GridLayoutItem.displayName = 'GridLayoutItem';
