import { z } from 'zod';

/** 零基 Cell 地址 schema */
export const TableCellAddressSchema = z
  .strictObject({
    row: z.number().int().nonnegative().describe('Zero-based row index in the structure output.'),
    column: z.number().int().nonnegative().describe('Zero-based column index in the structure output.'),
  })
  .describe('Zero-based Table Cell address.');

/** 零基 Cell 地址 */
export type IRTableCellAddress = z.infer<typeof TableCellAddressSchema>;
