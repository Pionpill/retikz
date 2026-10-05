import type { CanonicalLayoutContainerBox } from '@retikz/layout/compose';

import type { IRLegend, IRLegendItemsContent, IRLegendRampContent } from '..';

/** 已确定共享容器盒模型的 Legend */
export type CanonicalLegend = Omit<IRLegend, keyof CanonicalLayoutContainerBox | 'content'> &
  CanonicalLayoutContainerBox &
  Required<Pick<IRLegend, 'titleGap' | 'contentAlign'>> & {
    /** 已补齐默认值的离散图例或连续图例内容 */
    content: CanonicalLegendItemsContent | CanonicalLegendRampContent;
  };

/** 已展开行列间距且确定排列策略的离散图例 */
export type CanonicalLegendItemsContent = Required<Omit<IRLegendItemsContent, 'gap'>> & {
  /** 已从统一数值展开的图例项布局间距 */
  gap: Exclude<NonNullable<IRLegendItemsContent['gap']>, number>;
};

/** 已确定方向和样本间距的连续图例 */
export type CanonicalLegendRampContent = Required<IRLegendRampContent>;
