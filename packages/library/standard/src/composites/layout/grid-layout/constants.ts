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

/** GridLayout 布局产物中轨道的定义尺寸来源 */
export const LayoutTrackSourceKind = {
  /** 固定轨道尺寸 */
  Fixed: 'fixed',
  /** 根据内容最小尺寸确定轨道 */
  ContentMinimum: 'content-minimum',
  /** 根据内容自然尺寸确定轨道 */
  ContentNatural: 'content-natural',
  /** 根据剩余空间比例确定轨道 */
  Fraction: 'fraction',
  /** 根据最小值和最大值共同确定轨道 */
  Minmax: 'minmax',
} as const;

/** GridLayout 单轴最多解析的显式与隐式 track 数 */
export const GRID_LAYOUT_MAX_TRACKS_PER_AXIS = 10_000;
