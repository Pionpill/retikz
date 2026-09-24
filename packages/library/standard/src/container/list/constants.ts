import type { ValueOf } from '@retikz/foundation';

/** List 单元格的排列方向 */
export const ListDirection = { Row: 'row', Column: 'column' } as const;

/** 索引条相对单元格排列轴的位置 */
export const ListIndexPosition = { Before: 'before', After: 'after' } as const;

/** 直属单元格身份来源 */
export const ListCellIdMode = { Explicit: 'explicit', String: 'string', Index: 'index' } as const;

export type ListCellIdModeValue = ValueOf<typeof ListCellIdMode>;
