import type { ViewBox } from '@retikz/core';

/** 把 ViewBox 对象格式化为 SVG `viewBox` 属性字符串 */
export const formatViewBox = (vb: ViewBox): string =>
  `${vb.x} ${vb.y} ${vb.width} ${vb.height}`;
