/** 单轴容器尺寸策略 */
export const LayoutAxisSizeKind = {
  Content: 'content',
  Fixed: 'fixed',
  Fill: 'fill',
} as const;

/** LayoutItem 所属容器种类 */
export const LayoutItemKind = {
  Flex: 'flex',
  Grid: 'grid',
  Overlay: 'overlay',
} as const;

/** 物理轴上的 item 对齐方式 */
export const LayoutAlignment = {
  Start: 'start',
  Center: 'center',
  End: 'end',
  Stretch: 'stretch',
  FirstBaseline: 'first-baseline',
  LastBaseline: 'last-baseline',
} as const;

/** 剩余空间分布方式 */
export const LayoutDistribution = {
  Start: 'start',
  Center: 'center',
  End: 'end',
  Stretch: 'stretch',
  SpaceBetween: 'space-between',
  SpaceAround: 'space-around',
  SpaceEvenly: 'space-evenly',
} as const;

/** 容器视觉溢出策略 */
export const LayoutOverflow = {
  Visible: 'visible',
  Clip: 'clip',
} as const;

/** GridLayout artifact 中 track 的 authored sizing 来源 */
export const LayoutTrackSourceKind = {
  Fixed: 'fixed',
  ContentMinimum: 'content-minimum',
  ContentNatural: 'content-natural',
  Fraction: 'fraction',
  Minmax: 'minmax',
} as const;

/** Layout artifact spacing 区域的语义种类 */
export const LayoutSpacingKind = {
  Gap: 'gap',
  Distributed: 'distributed',
} as const;
