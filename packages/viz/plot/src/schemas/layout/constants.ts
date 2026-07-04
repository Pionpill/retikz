import type { ValueOf } from '@retikz/core';

/** Plot layout mode：自动占位或固定布局。 */
export const PlotLayoutMode = {
  Auto: 'auto',
  Fixed: 'fixed',
} as const;

export type PlotLayoutModeValue = ValueOf<typeof PlotLayoutMode>;

/** Layout 剩余冲突处理策略。 */
export const LayoutCollisionStrategy = {
  None: 'none',
  Shift: 'shift',
  Hide: 'hide',
} as const;

export type LayoutCollisionStrategyValue = ValueOf<typeof LayoutCollisionStrategy>;

/** Label placement 目标区域。 */
export const LayoutPlacementTarget = {
  Frame: 'frame',
  PlotArea: 'plotArea',
  View: 'view',
} as const;

export type LayoutPlacementTargetValue = ValueOf<typeof LayoutPlacementTarget>;

/** Label placement kind。 */
export const LayoutPlacementKind = {
  Side: 'side',
  Point: 'point',
} as const;

export type LayoutPlacementKindValue = ValueOf<typeof LayoutPlacementKind>;

/** Plot label type。 */
export const PlotLabelType = {
  Text: 'text',
} as const;

export type PlotLabelTypeValue = ValueOf<typeof PlotLabelType>;

/** Plot text label role。 */
export const PlotLabelRole = {
  Title: 'title',
  Caption: 'caption',
  Note: 'note',
  Source: 'source',
  Custom: 'custom',
} as const;

export type PlotLabelRoleValue = ValueOf<typeof PlotLabelRole>;

/** Plot label overflow 处理策略。 */
export const PlotLabelOverflow = {
  Allow: 'allow',
  Hide: 'hide',
  Flush: 'flush',
  Shift: 'shift',
  Ellipsis: 'ellipsis',
} as const;

export type PlotLabelOverflowValue = ValueOf<typeof PlotLabelOverflow>;

/** Label 文本锚点。 */
export const LayoutAnchor = {
  Auto: 'auto',
  Start: 'start',
  Center: 'center',
  End: 'end',
} as const;

export type LayoutAnchorValue = ValueOf<typeof LayoutAnchor>;
