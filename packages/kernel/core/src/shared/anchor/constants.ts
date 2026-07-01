/** 中心 anchor 独立于各方向 anchor 词汇，由消费方按场景单独处理。 */
export const CenterAnchor = {
  Center: 'center',
} as const;

/** Web/CSS 风格的 side 名称，是内部 canonical side 词汇。 */
export const WebSide = {
  Top: 'top',
  Right: 'right',
  Bottom: 'bottom',
  Left: 'left',
} as const;

/** Web/CSS 风格的 corner 名称，是内部 canonical corner 词汇。 */
export const WebCorner = {
  TopRight: 'top-right',
  TopLeft: 'top-left',
  BottomRight: 'bottom-right',
  BottomLeft: 'bottom-left',
} as const;

/** Web/CSS 风格的 anchor 名称，是内部 canonical 方位 anchor 词汇。 */
export const WebAnchor = {
  ...WebSide,
  ...WebCorner,
} as const;

/** Compass 风格的 side 输入别名，使用 north/south/east/west 命名。 */
export const CompassSide = {
  North: 'north',
  South: 'south',
  East: 'east',
  West: 'west',
} as const;

/** Compass 风格的 corner 输入别名，使用 north-east / south-west 命名。 */
export const CompassCorner = {
  NorthEast: 'north-east',
  NorthWest: 'north-west',
  SouthEast: 'south-east',
  SouthWest: 'south-west',
} as const;

/** Compass 风格 anchor 只作为输入别名，最终归一到 WebAnchor。 */
export const CompassAnchor = {
  ...CompassSide,
  ...CompassCorner,
} as const;

/** TikZ positioning 风格的 side 输入别名，例如 above / below。 */
export const TikzSide = {
  Above: 'above',
  Below: 'below',
  Right: 'right',
  Left: 'left',
} as const;

/** TikZ positioning 风格的 corner 输入别名，例如 above-left / below-right。 */
export const TikzCorner = {
  AboveRight: 'above-right',
  AboveLeft: 'above-left',
  BelowRight: 'below-right',
  BelowLeft: 'below-left',
} as const;

/** TikZ positioning 风格 anchor 只作为输入别名，最终归一到 WebAnchor。 */
export const TikzAnchor = {
  ...TikzSide,
  ...TikzCorner,
} as const;
