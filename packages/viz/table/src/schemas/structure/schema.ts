import { JsonValueSchema, NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, null as zodNull, object, strictObject, union } from 'zod';

import { ManualTableCellSchema, TableCellLayoutSchema, TableCellPayloadSchema } from '../cell';
import { TableFormatterRefSchema } from '../formatter';
import { TablePresentationRefSchema } from '../presentation';
import { RESERVED_TABLE_STRUCTURE_KINDS, TableRowKind, TableStructureKind } from './constants';

/** 校验规范表格行的语义种类 */
export const TableRowKindSchema = zodEnum(TableRowKind).describe('Semantic kind of a canonical Table row.');

/** 校验可 JSON 序列化的自定义结构操作，并拒绝内置保留种类 */
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

/** 校验绑定单个外部数据字段的明细列及其标题与呈现选项 */
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

/** 校验将每条数据记录映射为表体行的明细结构，列标识必须唯一 */
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

/** 校验按行优先编写的矩形单元格矩阵与对应行种类 */
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

/** 校验内置显式结构、明细结构或自定义结构操作 */
export const TableStructureSchema = union([
  ManualTableStructureSchema,
  DetailTableStructureSchema,
  CustomTableStructureSchema,
]).describe('Table structure operation: built-in manual/detail or a JSON-safe custom provider operation.');
