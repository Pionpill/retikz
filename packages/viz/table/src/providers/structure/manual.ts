import type { IRManualTableCell, IRTableCellPayload } from '../../schemas';

import { defineTableStructure } from '../../contract';
import {
  ManualTableStructureSchema,
  TableCellLocation,
  TableCellPayloadKind,
  TableCellRole,
  TableRowKind,
} from '../../schemas';
import { TableCellSourceKind } from '../../shared';

/** 把 manual Cell entry 转换为 canonical payload */
const payloadOf = (cell: IRManualTableCell): IRTableCellPayload => {
  if (typeof cell !== 'object') return { kind: TableCellPayloadKind.Value, value: cell };
  if ('value' in cell) {
    return {
      kind: TableCellPayloadKind.Value,
      value: cell.value,
      ...(cell.formatter === undefined ? {} : { formatter: cell.formatter }),
      ...(cell.presentation === undefined ? {} : { presentation: cell.presentation }),
    };
  }
  return { kind: TableCellPayloadKind.Content, content: cell.content };
};

/** manual Table structure definition */
export const MANUAL_TABLE_STRUCTURE = defineTableStructure({
  schema: ManualTableStructureSchema,
  build: spec => {
    const rowKinds = spec.rowKinds ?? Array.from({ length: spec.rows.length }, () => TableRowKind.Body);
    return {
      rows: rowKinds.map(kind => ({ kind })),
      columns: Array.from({ length: spec.rows[0].length }, () => ({})),
      cells: spec.rows.flatMap((row, rowIndex) =>
        row.flatMap((cell, columnIndex) => {
          if (cell === null) return [];
          const rowKind = rowKinds[rowIndex] ?? TableRowKind.Body;
          const isHeader = rowKind === TableRowKind.ColumnHeader;
          const fields = typeof cell === 'object' ? cell : undefined;
          return [
            {
              ...(fields?.id === undefined ? {} : { id: fields.id }),
              row: rowIndex,
              column: columnIndex,
              payload: payloadOf(cell),
              location: fields?.location ?? (isHeader ? TableCellLocation.ColumnHeader : TableCellLocation.Body),
              roles: fields?.roles ?? [isHeader ? TableCellRole.ColumnHeader : TableCellRole.Data],
              ...(fields?.span === undefined ? {} : { span: fields.span }),
              ...(fields?.layout === undefined ? {} : { layout: fields.layout }),
              source: { kind: TableCellSourceKind.Manual, row: rowIndex, column: columnIndex },
            },
          ];
        }),
      ),
    };
  },
});
