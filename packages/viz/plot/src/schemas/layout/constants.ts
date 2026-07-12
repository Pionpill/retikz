/** Plot layout mode：自动占位或固定布局。 */
export const PlotLayoutMode = {
  Auto: 'auto',
  Fixed: 'fixed',
} as const;

/** Label placement 目标区域。 */
export const LayoutPlacementTarget = {
  Frame: 'frame',
  PlotArea: 'plotArea',
} as const;

/** Label placement kind。 */
export const LayoutPlacementKind = {
  Side: 'side',
  Point: 'point',
} as const;

/** Plot label type。 */
export const PlotLabelType = {
  Text: 'text',
} as const;

/** Plot text label role。 */
export const PlotLabelRole = {
  Title: 'title',
  Caption: 'caption',
  Note: 'note',
  Source: 'source',
  Custom: 'custom',
} as const;

/** Label 文本锚点。 */
export const LayoutAnchor = {
  Auto: 'auto',
  Start: 'start',
  Center: 'center',
  End: 'end',
} as const;
