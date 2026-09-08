import { resolveBoxSpacing } from '@retikz/core';

import type { SemanticTableModel, TableStructureOutput } from '../../contract';
import type { IRManualTableStructure, IRTableStructureOperation } from '../../schemas';
import type { NormalizeTableStructureOptions } from './types';

import { TableStructureOutputSchema } from '../../contract/structure';
import { RetikzTableError } from '../../error';
import { resolveTableStructureRegistry, tableStructureDefinitionOf } from '../../providers';
import {
  TableCellFit,
  TableCellOverflow,
  TableHorizontalAlignment,
  TableStructureKind,
  TableVerticalAlignment,
} from '../../schemas';
import { deepFreeze } from '../../shared';
import { createTableStructureContext } from './context';
import { validateTableStructureOutput } from './validate';

const errorMessageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const createSemanticTableModel = (output: TableStructureOutput): SemanticTableModel =>
  deepFreeze({
    rows: output.rows.map((row, index) => ({ ...row, index })),
    columns: output.columns.map((column, index) => ({ ...column, index })),
    cells: output.cells.map(cell => ({
      ...(cell.id === undefined ? {} : { id: cell.id }),
      ...(output.rows[cell.row].id === undefined ? {} : { rowId: output.rows[cell.row].id }),
      ...(output.columns[cell.column].id === undefined ? {} : { columnId: output.columns[cell.column].id }),
      rowIndex: cell.row,
      columnIndex: cell.column,
      location: cell.location,
      roles: cell.roles,
      payload: cell.payload,
      span: {
        rows: cell.span?.rows ?? 1,
        columns: cell.span?.columns ?? 1,
      },
      layout: {
        padding: resolveBoxSpacing(cell.layout?.padding, 0),
        horizontalAlign: cell.layout?.horizontalAlign ?? TableHorizontalAlignment.Center,
        verticalAlign: cell.layout?.verticalAlign ?? TableVerticalAlignment.Center,
        wrap: cell.layout?.wrap ?? false,
        fit: cell.layout?.fit ?? TableCellFit.None,
        overflow: cell.layout?.overflow ?? TableCellOverflow.Visible,
        ...(cell.layout?.borders === undefined ? {} : { borders: cell.layout.borders }),
      },
      ...(cell.source === undefined ? {} : { source: cell.source }),
    })),
  });

/** 把任意注册的 structure operation 规范化为 canonical SemanticTableModel */
export const normalizeTableStructure = (
  operation: IRTableStructureOperation,
  options: NormalizeTableStructureOptions = {},
): SemanticTableModel => {
  const kind = operation.kind;
  const prefix = `table: structure "${kind}"`;
  try {
    const registry = resolveTableStructureRegistry(options.structureDefinitions);
    const definition = tableStructureDefinitionOf(operation.kind, registry);
    const preciseOperation = definition.schema.parse(operation) as IRTableStructureOperation;
    const context = createTableStructureContext(options.data, options.datasets ?? {});
    const providerOutput = definition.build(preciseOperation as never, context);
    const output = deepFreeze(TableStructureOutputSchema.parse(providerOutput));
    const manualRows =
      operation.kind === TableStructureKind.Manual ? (operation as IRManualTableStructure).rows : undefined;
    validateTableStructureOutput(
      output,
      {
        kind: preciseOperation.kind,
        ...(manualRows === undefined ? {} : { manualRows }),
      },
      context,
    );
    return createSemanticTableModel(output);
  } catch (error) {
    throw new RetikzTableError(`${prefix}: ${errorMessageOf(error)}`, { cause: error });
  }
};
