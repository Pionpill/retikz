import { z } from 'zod';

import { TableCellSchema } from '../cell';
import { TableStructureKind } from './constants';
import { TableRowKindSchema } from './row';

/** manual Table structure schema */
export const ManualTableStructureSchema = z
  .strictObject({
    kind: z.literal(TableStructureKind.Manual).describe('Discriminator for an explicit manual Table structure.'),
    rows: z.number().int().positive().describe('Number of explicit rows.'),
    columns: z.number().int().positive().describe('Number of explicit columns.'),
    rowKinds: z
      .array(TableRowKindSchema)
      .optional()
      .describe('Optional semantic kind for each row. Omitted fields make every row a body row.'),
    cells: z.array(TableCellSchema).describe('Explicit Cells addressed within the declared row and column counts.'),
  })
  .superRefine((structure, context) => {
    if (structure.rowKinds !== undefined && structure.rowKinds.length !== structure.rows) {
      context.addIssue({
        code: 'custom',
        path: ['rowKinds'],
        message: 'rowKinds length must equal rows',
      });
    }
  })
  .describe('Manual Table structure with explicit dimensions and Cells.');
