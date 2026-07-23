import { JsonValueSchema } from '@retikz/core';
import { z } from 'zod';

import { TableCellPayloadSchema, TableCellSchema } from '../cell';
import { TablePresentationRefSchema } from '../presentation';
import { RESERVED_TABLE_STRUCTURE_KINDS, TableRowKind, TableStructureKind } from './constants';

export const TableRowKindSchema = z.enum(TableRowKind).describe('Semantic kind of a canonical Table row.');

export const CustomTableStructureSchema = z
  .object({
    kind: z.string().min(1).describe('Custom Table structure provider kind.'),
  })
  .catchall(JsonValueSchema)
  .superRefine((operation, context) => {
    if ((RESERVED_TABLE_STRUCTURE_KINDS as ReadonlyArray<string>).includes(operation.kind)) {
      context.addIssue({
        code: 'custom',
        path: ['kind'],
        message: `Table structure kind "${operation.kind}" is reserved`,
        continue: false,
      });
    }
  })
  .describe('JSON-safe custom Table structure operation resolved by a registered definition.');

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

export const TableStructureSchema = z
  .union([ManualTableStructureSchema, DetailTableStructureSchema, CustomTableStructureSchema])
  .describe('Table structure operation: built-in manual/detail or a JSON-safe custom provider operation.');
