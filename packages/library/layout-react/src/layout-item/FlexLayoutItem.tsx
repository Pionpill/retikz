import type { FlexLayoutItemInput } from '@retikz/layout';
import { RetikzLayoutError, RetikzLayoutErrorCode } from '@retikz/layout';
import type { FC } from 'react';

import type { LayoutItemChildSource } from './types';

/** FlexLayout 直属 item 的 React authoring props */
export type FlexLayoutItemProps = Omit<FlexLayoutItemInput, 'child' | 'key' | 'kind'> &
  Readonly<{
    /** 容器内稳定身份；省略时内部按位置生成，不读取 React key */
    itemKey?: string;
  }> &
  LayoutItemChildSource;

/** 由 FlexLayout 静态读取的直属布局子项 */
export const FlexLayoutItem: FC<FlexLayoutItemProps> = () => {
  throw new RetikzLayoutError({
    code: RetikzLayoutErrorCode.AuthoringInvalid,
    message: 'FlexLayoutItem must be a direct child of FlexLayout or InspectFlexLayout',
    details: { component: 'FlexLayoutItem' },
  });
};

FlexLayoutItem.displayName = 'FlexLayoutItem';
