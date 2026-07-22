import type { TableStructureContext, TableStructureOutput } from '../../contract/structure';
import type { IRTableStructureOperation } from '../../schemas';

import { TableCellSourceKind } from '../../contract/structure';
import { ManualTableStructureSchema, TableCellLocation, TableCellRole, TableRowKind } from '../../schemas';

const assertUniqueIds = (owner: string, values: ReadonlyArray<{ id: string }>): void => {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) throw new Error(`duplicate ${owner} id "${value.id}"`);
    ids.add(value.id);
  }
};

/** 验证 Structure Definition output 的 canonical 跨字段矩阵 */
export const validateTableStructureOutput = (
  output: TableStructureOutput,
  operation: IRTableStructureOperation,
  context: TableStructureContext,
): void => {
  assertUniqueIds('row', output.rows);
  assertUniqueIds('column', output.columns);

  const addresses = new Set<string>();
  const sourceIndices = new Set(context.data?.sourceIndices ?? []);
  const manualOperation = ManualTableStructureSchema.safeParse(operation);
  for (const row of output.rows) {
    if (row.kind === TableRowKind.ColumnHeader && row.sourceIndex !== undefined) {
      throw new Error(`columnHeader row "${row.id}" cannot declare sourceIndex`);
    }
    if (row.kind === TableRowKind.Body && row.sourceIndex !== undefined && !sourceIndices.has(row.sourceIndex)) {
      throw new Error(`body row "${row.id}" references unknown sourceIndex ${row.sourceIndex}`);
    }
  }

  for (const cell of output.cells) {
    if (cell.row >= output.rows.length) throw new Error(`Cell "${cell.id}" row ${cell.row} is out of range`);
    if (cell.column >= output.columns.length) {
      throw new Error(`Cell "${cell.id}" column ${cell.column} is out of range`);
    }
    const address = `${cell.row}:${cell.column}`;
    if (addresses.has(address)) throw new Error(`duplicate Cell address (${cell.row}, ${cell.column})`);
    addresses.add(address);

    const row = output.rows[cell.row];
    const isHeader = row.kind === TableRowKind.ColumnHeader;
    const expectedLocation = isHeader ? TableCellLocation.ColumnHeader : TableCellLocation.Body;
    const expectedRole = isHeader ? TableCellRole.ColumnHeader : TableCellRole.Data;
    if (cell.location !== expectedLocation || cell.roles.length !== 1 || cell.roles[0] !== expectedRole) {
      throw new Error(`Cell "${cell.id}" location/roles do not match row kind "${row.kind}"`);
    }

    if (cell.source?.kind === TableCellSourceKind.Manual) {
      if (!manualOperation.success) throw new Error(`Cell "${cell.id}" uses manual source outside manual structure`);
      if (cell.source.cellIndex >= manualOperation.data.cells.length) {
        throw new Error(`Cell "${cell.id}" manual cellIndex ${cell.source.cellIndex} is out of range`);
      }
    }
    if (cell.source?.kind === TableCellSourceKind.Field) {
      if (context.data === undefined) throw new Error(`Cell "${cell.id}" field source requires data context`);
      if (cell.location !== TableCellLocation.Body)
        throw new Error(`Cell "${cell.id}" field source must be a body Cell`);
      if (cell.source.reference !== context.data.reference) {
        throw new Error(`Cell "${cell.id}" field source reference does not match Table data reference`);
      }
      if (!sourceIndices.has(cell.source.sourceIndex)) {
        throw new Error(`Cell "${cell.id}" field sourceIndex ${cell.source.sourceIndex} is unknown`);
      }
    }
    if (cell.source?.kind === TableCellSourceKind.Generated && cell.source.structureKind !== operation.kind) {
      throw new Error(`Cell "${cell.id}" generated source must match structure kind "${operation.kind}"`);
    }
  }
  assertUniqueIds('cell', output.cells);
};
