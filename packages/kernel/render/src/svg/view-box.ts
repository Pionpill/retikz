import type { BoundsRect } from '@retikz/math';

/** 把布局边界格式化为 SVG `viewBox` 属性字符串。 */
export const formatViewBox = (layout: BoundsRect): string =>
  `${layout.x} ${layout.y} ${layout.width} ${layout.height}`;
