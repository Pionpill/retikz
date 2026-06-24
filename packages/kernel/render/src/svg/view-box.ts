import type { Layout } from '@retikz/core';

/** 把 Layout 对象格式化为 SVG `viewBox` 属性字符串 */
export const formatViewBox = (layout: Layout): string =>
  `${layout.x} ${layout.y} ${layout.width} ${layout.height}`;
