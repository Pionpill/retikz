import { JsonValueSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, null as zodNull, object, strictObject, union } from 'zod';

import { ManualTableCellSchema, TableCellLayoutSchema, TableCellPayloadSchema } from '../cell';
import { TableFormatterRefSchema } from '../formatter';
import { TablePresentationRefSchema } from '../presentation';
import { RESERVED_TABLE_STRUCTURE_KINDS, TableRowKind, TableStructureKind } from './constants';

export const TableRowKindSchema = zodEnum(TableRowKind).describe('Semantic kind of a canonical Table row.');

export const CustomTableStructureSchema = object({
  kind: NonBlankStringSchema.describe('Custom Table structure provider kind.'),
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

export const TableDetailColumnSchema = strictObject({
  id: NonBlankStringSchema.describe('Stable detail column id.'),
  field: NonBlankStringSchema.describe('Data field name or dotted path read from each source row.'),
  header: TableCellPayloadSchema.optional().describe(
    'Optional column header payload. Omitted fields present the column id as text.',
  ),
  formatter: TableFormatterRefSchema.optional().describe(
    'Optional formatter applied to body values in this column. Omitted fields use identity.',
  ),
  presentation: TablePresentationRefSchema.optional().describe(
    'Optional presentation applied to body values in this column.',
  ),
  headerLayout: TableCellLayoutSchema.optional().describe('Optional layout applied to this column header Cell.'),
  bodyLayout: TableCellLayoutSchema.optional().describe('Optional layout applied to body Cells in this column.'),
}).describe('Detail Table column bound to one external data field.');

export const DetailTableStructureSchema = strictObject({
  kind: literal(TableStructureKind.Detail).describe('Discriminator for a record-per-row detail Table structure.'),
  columns: array(TableDetailColumnSchema).min(1).describe('Ordered detail columns.'),
  header: boolean()
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

const ManualTableRowSchema = array(union([ManualTableCellSchema, zodNull()]))
  .min(1)
  .describe('Nonempty row of manual Cell entries; null marks an unoccupied coordinate.');

export const ManualTableStructureSchema = strictObject({
  kind: literal(TableStructureKind.Manual).describe('Discriminator for an explicit manual Table structure.'),
  rows: array(ManualTableRowSchema).min(1).describe('Nonempty rectangular matrix of manual Table Cell entries.'),
  rowKinds: array(TableRowKindSchema)
    .optional()
    .describe('Optional semantic kind for each row. Omitted fields make every row a body row.'),
})
  .superRefine((structure, context) => {
    const columnCount = structure.rows[0]?.length;
    structure.rows.forEach((row, index) => {
      if (row.length !== columnCount) {
        context.addIssue({
          code: 'custom',
          path: ['rows', index],
          message: 'manual Table rows must have equal lengths',
        });
      }
    });

    if (structure.rowKinds !== undefined && structure.rowKinds.length !== structure.rows.length) {
      context.addIssue({
        code: 'custom',
        path: ['rowKinds'],
        message: 'rowKinds length must equal rows length',
      });
    }
  })
  .describe('Manual Table structure whose dimensions and Cell addresses derive from a row-major matrix.');

export const TableStructureSchema = union([
  ManualTableStructureSchema,
  DetailTableStructureSchema,
  CustomTableStructureSchema,
]).describe('Table structure operation: built-in manual/detail or a JSON-safe custom provider operation.');
