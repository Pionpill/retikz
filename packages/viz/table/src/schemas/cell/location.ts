import type { ValueOf } from '@retikz/core';

import { z } from 'zod';

/** Cell 在表格语义区域中的位置 */
export const TableCellLocation = {
  /** 列表头区域 */
  ColumnHeader: 'columnHeader',
  /** 明细数据区域 */
  Body: 'body',
} as const;

/** Cell 语义位置取值 */
export type TableCellLocationValue = ValueOf<typeof TableCellLocation>;

/** Cell 语义位置 schema */
export const TableCellLocationSchema = z
  .enum(TableCellLocation)
  .describe('Semantic Table region occupied by the Cell.');
