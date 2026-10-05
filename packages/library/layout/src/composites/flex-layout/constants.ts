import type { ValueOf } from '@retikz/foundation';
/** FlexLayout 的主轴方向 */
export const FlexLayoutDirection = {
  Row: 'row',
  RowReverse: 'row-reverse',
  Column: 'column',
  ColumnReverse: 'column-reverse',
} as const;

/** FlexLayout 的换行策略 */
export const FlexLayoutWrap = {
  NoWrap: 'nowrap',
  Wrap: 'wrap',
  WrapReverse: 'wrap-reverse',
} as const;

/** FlexLayout 主轴方向取值 */
export type FlexLayoutDirection = ValueOf<typeof FlexLayoutDirection>;

/** FlexLayout 换行策略取值 */
export type FlexLayoutWrap = ValueOf<typeof FlexLayoutWrap>;
