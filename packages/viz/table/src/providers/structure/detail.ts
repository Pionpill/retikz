import { defineTableStructure, TableCellSourceKind } from '../../contract';
import {
  DetailTableStructureSchema,
  TableCellLocation,
  TableCellPayloadKind,
  TableCellRole,
  TableRowKind,
  TableStructureKind,
} from '../../schemas';

/** detail Table structure definition */
export const DETAIL_TABLE_STRUCTURE = defineTableStructure({
  schema: DetailTableStructureSchema,
  build: (spec, context) => {
    if (context.data === undefined) throw new Error('detail structure requires a data reference and dataset');
    context.resolveFieldTypes(new Set(spec.columns.map(column => column.field)));

    const hasHeader = spec.header !== false;
    const rows = [
      ...(hasHeader ? [{ id: 'row.header', kind: TableRowKind.ColumnHeader }] : []),
      ...context.data.sourceIndices.map(sourceIndex => ({
        id: `row.${sourceIndex}`,
        kind: TableRowKind.Body,
        sourceIndex,
      })),
    ];
    const columns = spec.columns.map(column => ({ id: column.id, field: column.field }));
    const cells = [
      ...(hasHeader
        ? spec.columns.map((column, columnIndex) => ({
            id: `cell.header.c${column.id}`,
            row: 0,
            column: columnIndex,
            payload: column.header ?? { kind: TableCellPayloadKind.Value, value: column.id },
            location: TableCellLocation.ColumnHeader,
            roles: [TableCellRole.ColumnHeader],
            ...(column.headerLayout === undefined ? {} : { layout: column.headerLayout }),
            source: { kind: TableCellSourceKind.Generated, structureKind: TableStructureKind.Detail },
          }))
        : []),
      ...context.data.sourceIndices.flatMap((sourceIndex, bodyIndex) =>
        spec.columns.map((column, columnIndex) => {
          const value = context.resolveField(sourceIndex, column.field);
          if (value === undefined) {
            throw new Error(`sourceIndex ${sourceIndex} is missing detail field "${column.field}"`);
          }
          return {
            id: `cell.r${sourceIndex}.c${column.id}`,
            row: bodyIndex + (hasHeader ? 1 : 0),
            column: columnIndex,
            payload: {
              kind: TableCellPayloadKind.Value,
              value,
              ...(column.formatter === undefined ? {} : { formatter: column.formatter }),
              ...(column.presentation === undefined ? {} : { presentation: column.presentation }),
            },
            location: TableCellLocation.Body,
            roles: [TableCellRole.Data],
            ...(column.bodyLayout === undefined ? {} : { layout: column.bodyLayout }),
            source: {
              kind: TableCellSourceKind.Field,
              reference: context.data?.reference ?? '',
              sourceIndex,
              field: column.field,
            },
          };
        }),
      ),
    ];
    return { rows, columns, cells };
  },
});
