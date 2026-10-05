import type { ValueOf } from '@retikz/foundation';

/** Overlay item 的 placement 模式 */
export const OverlayPlacementKind = {
  Aligned: 'aligned',
  Positioned: 'positioned',
} as const;

/** Overlay item 是否参与 container intrinsic size */
export const LayoutSizeParticipation = {
  Include: 'include',
  Exclude: 'exclude',
} as const;

/** Overlay placement 判别值 */
export type OverlayPlacementKind = ValueOf<typeof OverlayPlacementKind>;

/** Overlay 结构尺寸参与策略值 */
export type LayoutSizeParticipation = ValueOf<typeof LayoutSizeParticipation>;
