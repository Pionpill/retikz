/** 将 CSS 长度转换为像素 */
export const convertCssToPx = (
  dimension?: string | number,
  sizeConfig?: { remSize?: number; emSize?: number; elementSize?: number },
) => {
  if (dimension === undefined) return 0;
  if (typeof dimension === 'number') return dimension;
  const match = dimension.match(/^(\d+(?:\.\d+)?)(px|em|rem|%)$/);
  const { remSize = 16, emSize = 16, elementSize = 100 } = sizeConfig || {};
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'px':
        return value;
      case 'em':
        return value * (emSize || remSize || 16);
      case 'rem':
        return value * (remSize || 16);
      case '%':
        return elementSize ? (value / 100) * elementSize : value;
      default:
        return 0;
    }
  }
  return parseInt(dimension);
};
