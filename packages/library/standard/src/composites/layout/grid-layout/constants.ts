/** GridLayout 自动放置的流向 */
export const GridAutoFlow = {
  Row: 'row',
  Column: 'column',
} as const;

/** GridLayout 显式区域重叠策略 */
export const GridOverlap = {
  Reject: 'reject',
  Allow: 'allow',
} as const;

/** GridLayout 单轴最多解析的显式与隐式 track 数 */
export const GRID_LAYOUT_MAX_TRACKS_PER_AXIS = 10_000;
