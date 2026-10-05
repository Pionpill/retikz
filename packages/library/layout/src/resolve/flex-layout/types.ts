import type { resolveBoxSpacing } from '@retikz/core';

import type { IRFlexLayout, IRFlexLayoutItem } from '../../composites/flex-layout';
import type { IRLayoutContainerBox } from '../../composites/shared';
import type { CanonicalLayoutContainerBox } from '../shared';

/** 已确定 flex 分配因子和 margin 的子项 */
export type CanonicalFlexLayoutItem = Omit<IRFlexLayoutItem, 'basis' | 'grow' | 'shrink' | 'margin'> &
  Required<Pick<IRFlexLayoutItem, 'basis' | 'grow' | 'shrink'>> & {
    /** 已展开为四边数值的子项外边距 */
    margin: ReturnType<typeof resolveBoxSpacing>;
  };

/** Flex 求解器消费的完整容器配置 */
export type CanonicalFlexLayout = Omit<IRFlexLayout, keyof IRLayoutContainerBox | 'children' | 'gap'> &
  CanonicalLayoutContainerBox &
  Required<Pick<IRFlexLayout, 'direction' | 'wrap' | 'justifyContent' | 'alignItems' | 'alignContent'>> & {
    /** 已展开为物理行列间距的配置 */
    gap: Exclude<NonNullable<IRFlexLayout['gap']>, number>;
    /** 按作者顺序排列的已解析 Flex 子项 */
    children: Array<CanonicalFlexLayoutItem>;
  };
