import type { resolveBoxSpacing } from '@retikz/core';

import type { IROverlayLayout, IROverlayLayoutItem } from '../../composites/overlay-layout';
import type { IRLayoutContainerBox } from '../../composites/shared';
import type { CanonicalLayoutContainerBox } from '../shared';

type PositionedPlacement = Extract<NonNullable<IROverlayLayoutItem['placement']>, { kind: 'positioned' }>;

/** 已展开定位锚点的 Overlay 放置配置 */
export type CanonicalOverlayPlacement =
  | Exclude<NonNullable<IROverlayLayoutItem['placement']>, PositionedPlacement>
  | (Omit<PositionedPlacement, 'anchor'> & { anchor: Required<NonNullable<PositionedPlacement['anchor']>> });

/** 已确定定位、偏移及堆叠的 Overlay 子项 */
export type CanonicalOverlayLayoutItem = Omit<IROverlayLayoutItem, 'margin' | 'placement' | 'offset'> &
  Required<Pick<IROverlayLayoutItem, 'sizeParticipation' | 'zIndex'>> & {
    margin: ReturnType<typeof resolveBoxSpacing>;
    placement: CanonicalOverlayPlacement;
    offset: Required<NonNullable<IROverlayLayoutItem['offset']>>;
  };

/** Overlay 求解器消费的完整容器配置 */
export type CanonicalOverlayLayout = Required<Omit<IROverlayLayout, keyof IRLayoutContainerBox | 'children'>> &
  CanonicalLayoutContainerBox & { children: Array<CanonicalOverlayLayoutItem> };
