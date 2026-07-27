import { defineTableStructure, TableCellSourceKind } from '../../contract';
import { ManualTableStructureSchema, TableCellLocation, TableCellRole, TableRowKind } from '../../schemas';

/** manual Table structure definition */
export const MANUAL_TABLE_STRUCTURE = defineTableStructure({
  schema: ManualTableStructureSchema,
  build: spec => {
    const rowKinds = spec.rowKinds ?? Array.from({ length: spec.rows }, () => TableRowKind.Body);
    return {
      rows: rowKinds.map((kind, index) => ({ id: `row.${index}`, kind })),
      columns: Array.from({ length: spec.columns }, (_, index) => ({ id: `column.${index}` })),
      cells: spec.cells.map((cell, cellIndex) => {
        const rowKind = rowKinds[cell.address.row] ?? TableRowKind.Body;
        const isHeader = rowKind === TableRowKind.ColumnHeader;
        return {
          id: cell.id ?? `cell.r${cell.address.row}.c${cell.address.column}`,
          row: cell.address.row,
          column: cell.address.column,
          payload: cell.payload,
          location: cell.location ?? (isHeader ? TableCellLocation.ColumnHeader : TableCellLocation.Body),
          roles: cell.roles ?? [isHeader ? TableCellRole.ColumnHeader : TableCellRole.Data],
          ...(cell.span === undefined ? {} : { span: cell.span }),
          ...(cell.layout === undefined ? {} : { layout: cell.layout }),
          source: { kind: TableCellSourceKind.Manual, cellIndex },
        };
      }),
    };
  },
});
