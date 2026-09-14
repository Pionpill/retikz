import type { resolveBoxSpacing } from '@retikz/core';

import type { IRGridLayout, IRGridLayoutItem, IRGridPlacement } from '../../composites/grid-layout';
import type { IRLayoutContainerBox } from '../../composites/shared';
import type { CanonicalLayoutContainerBox } from '../shared';

/** 已确定跨度的网格轴放置配置 */
export type CanonicalGridPlacement = IRGridPlacement & Required<Pick<IRGridPlacement, 'span'>>;

/** 已展开 margin 与轴放置配置的 Grid 子项 */
export type CanonicalGridLayoutItem = Omit<IRGridLayoutItem, 'margin' | 'column' | 'row'> & {
  margin: ReturnType<typeof resolveBoxSpacing>;
  column: CanonicalGridPlacement;
  row: CanonicalGridPlacement;
};

/** Grid 求解器消费的完整容器配置 */
export type CanonicalGridLayout = Required<Omit<IRGridLayout, keyof IRLayoutContainerBox | 'children'>> &
  CanonicalLayoutContainerBox & { children: Array<CanonicalGridLayoutItem> };
