import type { CanonicalLayoutContainerBox } from '@retikz/layout/compose';

import type { IRLegend, IRLegendItemsContent, IRLegendRampContent } from '../../composites/presentation/legend';

/** 已确定共享容器盒模型的 Legend */
export type CanonicalLegend = Omit<IRLegend, keyof CanonicalLayoutContainerBox | 'content'> &
  CanonicalLayoutContainerBox &
  Required<Pick<IRLegend, 'titleGap' | 'contentAlign'>> & {
    content: CanonicalLegendItemsContent | CanonicalLegendRampContent;
  };

/** 已展开行列间距且确定排列策略的离散图例 */
export type CanonicalLegendItemsContent = Required<Omit<IRLegendItemsContent, 'gap'>> & {
  gap: Exclude<NonNullable<IRLegendItemsContent['gap']>, number>;
};

/** 已确定方向和样本间距的连续图例 */
export type CanonicalLegendRampContent = Required<IRLegendRampContent>;
