import type { ValueOf } from '@retikz/foundation';
/** Grid 边框的 sibling 绘制顺序 */
export const GridBorderOrder = {
  Behind: 'behind',
  Front: 'front',
} as const;

/** Grid 线条未显式指定间距时使用的默认格距 */
export const DEFAULT_GRID_LINE_SPACING = 10;

/** Grid 边框 sibling 绘制顺序取值 */
export type GridBorderOrder = ValueOf<typeof GridBorderOrder>;
