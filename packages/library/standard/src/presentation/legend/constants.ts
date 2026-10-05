import type { ValueOf } from '@retikz/foundation';
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

/** Legend 内容形态取值 */
export type LegendContentKind = ValueOf<typeof LegendContentKind>;

/** Legend 物理排列方向取值 */
export type LegendDirection = ValueOf<typeof LegendDirection>;

/** Legend 离散条目换行策略取值 */
export type LegendWrap = ValueOf<typeof LegendWrap>;

/** Legend 样本物理 y 轴对齐方式取值 */
export type LegendSampleAlignment = ValueOf<typeof LegendSampleAlignment>;
