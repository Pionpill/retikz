import type { ValueOf } from '@retikz/foundation';

/** Table Cell 来源的判别值 */
export const TableCellSourceKind = {
  /** 来自 manual structure 的显式 Cell */
  Manual: 'manual',
  /** 来自外部数据字段 */
  Field: 'field',
  /** 由 structure definition 生成 */
  Generated: 'generated',
} as const;

/** Table Cell 来源判别值 */
export type TableCellSourceKindValue = ValueOf<typeof TableCellSourceKind>;
