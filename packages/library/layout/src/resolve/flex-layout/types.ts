import type { resolveBoxSpacing } from '@retikz/core';

import type { IRFlexLayout, IRFlexLayoutItem } from '../../composites/flex-layout';
import type { IRLayoutContainerBox } from '../../composites/shared';
import type { CanonicalLayoutContainerBox } from '../shared';

/** 已确定 flex 分配因子和 margin 的子项 */
export type CanonicalFlexLayoutItem = Omit<IRFlexLayoutItem, 'basis' | 'grow' | 'shrink' | 'margin'> &
  Required<Pick<IRFlexLayoutItem, 'basis' | 'grow' | 'shrink'>> & { margin: ReturnType<typeof resolveBoxSpacing> };

/** Flex 求解器消费的完整容器配置 */
export type CanonicalFlexLayout = Omit<IRFlexLayout, keyof IRLayoutContainerBox | 'children' | 'gap'> &
  CanonicalLayoutContainerBox &
  Required<Pick<IRFlexLayout, 'direction' | 'wrap' | 'justifyContent' | 'alignItems' | 'alignContent'>> & {
    gap: Exclude<NonNullable<IRFlexLayout['gap']>, number>;
    children: Array<CanonicalFlexLayoutItem>;
  };
