import type { ValueOf } from '@retikz/foundation';

/** Table structure 的内置与保留判别值 */
export const TableStructureKind = {
  /** 显式二维 Cell 结构 */
  Manual: 'manual',
  /** 一条数据记录对应一行的明细结构 */
  Detail: 'detail',
  /** 为交叉表保留 */
  Pivot: 'pivot',
  /** 为矩阵表保留 */
  Matrix: 'matrix',
  /** 防止扩展占用通用 custom 名称 */
  Custom: 'custom',
} as const;

/** v0.1 内置或保留的 Table structure kind */
export const RESERVED_TABLE_STRUCTURE_KINDS: ReadonlyArray<ValueOf<typeof TableStructureKind>> =
  Object.values(TableStructureKind);

/** canonical Table row 类型 */
export const TableRowKind = {
  /** 列表头行 */
  ColumnHeader: 'columnHeader',
  /** 明细数据行 */
  Body: 'body',
} as const;
