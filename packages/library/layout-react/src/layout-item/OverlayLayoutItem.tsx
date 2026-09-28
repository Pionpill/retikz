import type { OverlayLayoutItemInput } from '@retikz/layout';
import { RetikzLayoutError, RetikzLayoutErrorCode } from '@retikz/layout';
import type { FC } from 'react';

import type { LayoutItemChildSource } from './types';

/** OverlayLayout 直属 item 的 React authoring props */
export type OverlayLayoutItemProps = Omit<OverlayLayoutItemInput, 'child' | 'key' | 'kind'> &
  Readonly<{
    /** 容器内稳定身份；省略时内部按位置生成，不读取 React key */
    itemKey?: string;
  }> &
  LayoutItemChildSource;

/** 由 OverlayLayout 静态读取的直属布局子项 */
export const OverlayLayoutItem: FC<OverlayLayoutItemProps> = () => {
  throw new RetikzLayoutError({
    code: RetikzLayoutErrorCode.AuthoringInvalid,
    message: 'OverlayLayoutItem must be a direct child of OverlayLayout or InspectOverlayLayout',
    details: { component: 'OverlayLayoutItem' },
  });
};

OverlayLayoutItem.displayName = 'OverlayLayoutItem';
