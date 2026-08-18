import type { TableStructureContext, TableStructureOutput } from '../../contract/structure';
import type { IRTableStructureOperation } from '../../schemas';

import { RetikzTableError } from '../../error';
import { ManualTableStructureSchema, TableCellLocation, TableCellRole, TableRowKind } from '../../schemas';
import { TableCellSourceKind } from '../../shared';

const assertUniqueIds = (owner: string, values: ReadonlyArray<{ id: string }>): void => {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) throw new RetikzTableError(`duplicate ${owner} id "${value.id}"`);
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

  const occupancy = Array.from({ length: output.rows.length }, () =>
    Array.from<{ cellId: string } | undefined>({ length: output.columns.length }),
  );
  const sourceIndices = new Set(context.data?.sourceIndices ?? []);
  const manualOperation = ManualTableStructureSchema.safeParse(operation);
  for (const row of output.rows) {
    if (row.kind === TableRowKind.ColumnHeader && row.sourceIndex !== undefined) {
      throw new RetikzTableError(`columnHeader row "${row.id}" cannot declare sourceIndex`);
    }
    if (row.kind === TableRowKind.Body && row.sourceIndex !== undefined && !sourceIndices.has(row.sourceIndex)) {
      throw new RetikzTableError(`body row "${row.id}" references unknown sourceIndex ${row.sourceIndex}`);
    }
  }

  for (const cell of output.cells) {
    if (cell.row >= output.rows.length) throw new RetikzTableError(`Cell "${cell.id}" row ${cell.row} is out of range`);
    if (cell.column >= output.columns.length) {
      throw new RetikzTableError(`Cell "${cell.id}" column ${cell.column} is out of range`);
    }
    const row = output.rows[cell.row];
    const isHeader = row.kind === TableRowKind.ColumnHeader;
    const expectedLocation = isHeader ? TableCellLocation.ColumnHeader : TableCellLocation.Body;
    const expectedRole = isHeader ? TableCellRole.ColumnHeader : TableCellRole.Data;
    if (cell.location !== expectedLocation || cell.roles.length !== 1 || cell.roles[0] !== expectedRole) {
      throw new RetikzTableError(`Cell "${cell.id}" location/roles do not match row kind "${row.kind}"`);
    }

    if (cell.source?.kind === TableCellSourceKind.Manual) {
      if (!manualOperation.success)
        throw new RetikzTableError(`Cell "${cell.id}" uses manual source outside manual structure`);
      if (
        cell.source.row >= manualOperation.data.rows.length ||
        cell.source.column >= manualOperation.data.rows[0].length
      ) {
        throw new RetikzTableError(
          `Cell "${cell.id}" manual source (${cell.source.row}, ${cell.source.column}) is out of range`,
        );
      }
      const sourceEntry = manualOperation.data.rows[cell.source.row][cell.source.column];
      if (sourceEntry === null) {
        throw new RetikzTableError(
          `Cell "${cell.id}" manual source (${cell.source.row}, ${cell.source.column}) does not reference a Cell entry`,
        );
      }
      if (cell.source.row !== cell.row || cell.source.column !== cell.column) {
        throw new RetikzTableError(`Cell "${cell.id}" manual source must match its canonical coordinates`);
      }
    }
    if (cell.source?.kind === TableCellSourceKind.Field) {
      if (context.data === undefined)
        throw new RetikzTableError(`Cell "${cell.id}" field source requires data context`);
      if (cell.location !== TableCellLocation.Body)
        throw new RetikzTableError(`Cell "${cell.id}" field source must be a body Cell`);
      if (cell.source.reference !== context.data.reference) {
        throw new RetikzTableError(`Cell "${cell.id}" field source reference does not match Table data reference`);
      }
      if (!sourceIndices.has(cell.source.sourceIndex)) {
        throw new RetikzTableError(`Cell "${cell.id}" field sourceIndex ${cell.source.sourceIndex} is unknown`);
      }
    }
    if (cell.source?.kind === TableCellSourceKind.Generated && cell.source.structureKind !== operation.kind) {
      throw new RetikzTableError(`Cell "${cell.id}" generated source must match structure kind "${operation.kind}"`);
    }

    const rowSpan = cell.span?.rows ?? 1;
    const columnSpan = cell.span?.columns ?? 1;
    if (cell.row + rowSpan > output.rows.length || cell.column + columnSpan > output.columns.length) {
      throw new RetikzTableError(`Cell "${cell.id}" span range is out of bounds`);
    }
    for (let rowIndex = cell.row; rowIndex < cell.row + rowSpan; rowIndex += 1) {
      if (output.rows[rowIndex].kind !== row.kind) {
        throw new RetikzTableError(`Cell "${cell.id}" span crosses row kind at row ${rowIndex}`);
      }
      for (let columnIndex = cell.column; columnIndex < cell.column + columnSpan; columnIndex += 1) {
        const occupied = occupancy[rowIndex][columnIndex];
        if (occupied !== undefined) {
          throw new RetikzTableError(
            `Cell "${cell.id}" overlaps Cell "${occupied.cellId}" at (${rowIndex}, ${columnIndex})`,
          );
        }
        occupancy[rowIndex][columnIndex] = { cellId: cell.id };
      }
    }
  }
  assertUniqueIds('cell', output.cells);
};
