import type { ValueOf } from '@retikz/foundation';

/** Array 单元格的排列方向 */
export const ArrayDirection = { Row: 'row', Column: 'column' } as const;

/** 索引条相对单元格排列轴的位置 */
export const ArrayIndexPosition = { Before: 'before', After: 'after' } as const;

/** 直属单元格身份来源 */
export const ArrayCellIdMode = { Explicit: 'explicit', String: 'string', Index: 'index' } as const;

export type ArrayCellIdModeValue = ValueOf<typeof ArrayCellIdMode>;
