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
