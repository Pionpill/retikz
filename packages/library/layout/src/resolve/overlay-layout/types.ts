import type { resolveBoxSpacing } from '@retikz/core';

import type { IROverlayLayout, IROverlayLayoutItem } from '../../composites/overlay-layout';
import type { IRLayoutContainerBox } from '../../composites/shared';
import type { CanonicalLayoutContainerBox } from '../shared';

type PositionedPlacement = Extract<NonNullable<IROverlayLayoutItem['placement']>, { kind: 'positioned' }>;

/** 已展开定位锚点的 Overlay 放置配置 */
export type CanonicalOverlayPlacement =
  | Exclude<NonNullable<IROverlayLayoutItem['placement']>, PositionedPlacement>
  | (Omit<PositionedPlacement, 'anchor'> & {
      /** 坐标放置时用于匹配目标位置的完整二维锚点 */
      anchor: Required<NonNullable<PositionedPlacement['anchor']>>;
    });

/** 已确定定位、偏移及堆叠的 Overlay 子项 */
export type CanonicalOverlayLayoutItem = Omit<IROverlayLayoutItem, 'margin' | 'placement' | 'offset'> &
  Required<Pick<IROverlayLayoutItem, 'sizeParticipation' | 'zIndex'>> & {
    /** 已展开为四边数值的子项外边距 */
    margin: ReturnType<typeof resolveBoxSpacing>;
    /** 已确定判别分支及默认值的放置策略 */
    placement: CanonicalOverlayPlacement;
    /** 已补齐水平与垂直分量的放置偏移 */
    offset: Required<NonNullable<IROverlayLayoutItem['offset']>>;
  };

/** Overlay 求解器消费的完整容器配置 */
export type CanonicalOverlayLayout = Required<Omit<IROverlayLayout, keyof IRLayoutContainerBox | 'children'>> &
  CanonicalLayoutContainerBox & {
    /** 按作者顺序排列的已解析 Overlay 子项 */
    children: Array<CanonicalOverlayLayoutItem>;
  };
