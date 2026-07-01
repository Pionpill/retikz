/** 路径级箭头方向关键字。 */
/** 路径填充规则关键字。 */
export const PathFillRule = {
  /** Non-zero winding rule: sub-path direction decides whether nested regions cancel. */
  Nonzero: 'nonzero',
  /** Even-odd rule: each boundary crossing toggles filled / unfilled state, useful for holes and rings. */
  EvenOdd: 'evenodd',
} as const;

/** 路径端点线帽关键字。 */
export const PathLineCap = {
  Butt: 'butt',
  Round: 'round',
  Square: 'square',
} as const;

/** 路径拐角连接关键字。 */
export const PathLineJoin = {
  Miter: 'miter',
  Round: 'round',
  Bevel: 'bevel',
} as const;

/** 路径语义线宽关键字。 */
export const PathThickness = {
  UltraThin: 'ultraThin',
  VeryThin: 'veryThin',
  Thin: 'thin',
  Semithick: 'semithick',
  Thick: 'thick',
  VeryThick: 'veryThick',
  UltraThick: 'ultraThick',
} as const;
