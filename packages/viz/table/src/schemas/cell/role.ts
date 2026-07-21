import type { ValueOf } from '@retikz/core';

import { z } from 'zod';

/** Cell 可承担的语义角色 */
export const TableCellRole = {
  /** 列表头标签 */
  ColumnHeader: 'columnHeader',
  /** 明细数据值 */
  Data: 'data',
} as const;

/** Cell 语义角色取值 */
export type TableCellRoleValue = ValueOf<typeof TableCellRole>;

/** Cell 语义角色 schema */
export const TableCellRoleSchema = z.enum(TableCellRole).describe('Semantic role assigned to a Table Cell.');
