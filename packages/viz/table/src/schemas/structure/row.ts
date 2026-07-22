import type { ValueOf } from '@retikz/core';

import { z } from 'zod';

/** canonical Table row 类型 */
export const TableRowKind = {
  /** 列表头行 */
  ColumnHeader: 'columnHeader',
  /** 明细数据行 */
  Body: 'body',
} as const;

/** canonical Table row 类型取值 */
export type TableRowKindValue = ValueOf<typeof TableRowKind>;

/** canonical Table row 类型 schema */
export const TableRowKindSchema = z.enum(TableRowKind).describe('Semantic kind of a canonical Table row.');
