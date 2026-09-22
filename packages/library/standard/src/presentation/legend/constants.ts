/** Legend 内容形态 */
export const LegendContentKind = {
  Items: 'items',
  Ramp: 'ramp',
} as const;

/** Legend 内容的物理排列方向 */
export const LegendDirection = {
  Vertical: 'vertical',
  Horizontal: 'horizontal',
} as const;

/** Legend 离散条目的换行策略 */
export const LegendWrap = {
  NoWrap: 'nowrap',
  Wrap: 'wrap',
} as const;

/** Legend 离散样本相对标签的物理 y 轴对齐方式 */
export const LegendSampleAlignment = {
  Start: 'start',
  Center: 'center',
  End: 'end',
} as const;
