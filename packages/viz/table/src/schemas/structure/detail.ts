import { z } from 'zod';

import { TableCellPayloadSchema } from '../cell';
import { TablePresentationRefSchema } from '../presentation';
import { TableStructureKind } from './constants';

/** detail Table column schema */
export const TableDetailColumnSchema = z
  .strictObject({
    id: z.string().min(1).describe('Stable detail column id.'),
    field: z.string().min(1).describe('Data field name or dotted path read from each source row.'),
    header: TableCellPayloadSchema.optional().describe(
      'Optional column header payload. Omitted fields present the column id as text.',
    ),
    presentation: TablePresentationRefSchema.optional().describe(
      'Optional presentation applied to body values in this column.',
    ),
  })
  .describe('Detail Table column bound to one external data field.');

/** detail Table structure schema */
export const DetailTableStructureSchema = z
  .strictObject({
    kind: z.literal(TableStructureKind.Detail).describe('Discriminator for a record-per-row detail Table structure.'),
    columns: z.array(TableDetailColumnSchema).min(1).describe('Ordered detail columns.'),
    header: z
      .boolean()
      .optional()
      .describe('Whether to generate a column-header row. Omitted fields behave as true at runtime.'),
  })
  .superRefine((structure, context) => {
    const ids = new Set<string>();
    structure.columns.forEach((column, index) => {
      if (ids.has(column.id)) {
        context.addIssue({
          code: 'custom',
          path: ['columns', index, 'id'],
          message: `duplicate detail column id "${column.id}"`,
        });
      }
      ids.add(column.id);
    });
  })
  .describe('Detail Table structure that maps each source record to one body row.');
