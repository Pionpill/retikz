/**
 * 多行文本几何（renderer 无关纯函数）。
 */
import type { TextPrim } from '@retikz/core';

/**
 * 多行文本块的首行纵向偏移（dy；SVG tspan dy 与 Canvas 首行下移共用口径）
 * @description 把整块文字按 baseline 在锚点 (x, y) 上对齐，推算首行相对锚点的偏移：
 *   middle（中心对齐）→ 首行上推 `(n-1)/2 × lineHeight`；bottom（块底对齐）→ 上推 `(n-1) × lineHeight`；
 *   top / alphabetic（块顶对齐）→ 0。SVG 与 Canvas 两端共用此式，钉死多行垂直对齐口径不漂移。
 */
export const firstLineDy = (text: Pick<TextPrim, 'baseline' | 'lineHeight'> & { lines: { length: number } }): number => {
  const n = text.lines.length;
  if (text.baseline === 'middle') return (-(n - 1) / 2) * text.lineHeight;
  if (text.baseline === 'bottom') return -(n - 1) * text.lineHeight;
  return 0;
};
