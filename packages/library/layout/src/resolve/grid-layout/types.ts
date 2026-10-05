import type { resolveBoxSpacing } from '@retikz/core';

import type { IRGridLayout, IRGridLayoutItem, IRGridPlacement } from '../../composites/grid-layout';
import type { IRLayoutContainerBox } from '../../composites/shared';
import type { CanonicalLayoutContainerBox } from '../shared';

/** 已确定跨度的网格轴放置配置 */
export type CanonicalGridPlacement = IRGridPlacement & Required<Pick<IRGridPlacement, 'span'>>;

/** 已展开 margin 与轴放置配置的 Grid 子项 */
export type CanonicalGridLayoutItem = Omit<IRGridLayoutItem, 'margin' | 'column' | 'row'> & {
  /** 已展开为四边数值的子项外边距 */
  margin: ReturnType<typeof resolveBoxSpacing>;
  /** 已展开简写的列放置声明 */
  column: CanonicalGridPlacement;
  /** 已展开简写的行放置声明 */
  row: CanonicalGridPlacement;
};

/** Grid 求解器消费的完整容器配置 */
export type CanonicalGridLayout = Required<Omit<IRGridLayout, keyof IRLayoutContainerBox | 'children'>> &
  CanonicalLayoutContainerBox & {
    /** 按作者顺序排列的已解析 Grid 子项 */
    children: Array<CanonicalGridLayoutItem>;
  };
