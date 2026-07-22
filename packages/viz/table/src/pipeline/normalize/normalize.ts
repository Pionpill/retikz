import { JsonObjectSchema } from '@retikz/core';

import type { SemanticTableModel, TableStructureOutput } from '../../contract';
import type { IRTableStructureOperation } from '../../schemas';
import type { NormalizeTableStructureOptions } from './types';

import { TableStructureOutputSchema } from '../../contract/structure';
import { resolveTableStructureRegistry, tableStructureDefinitionOf } from '../../providers';
import { TableStructureSchema } from '../../schemas';
import { deepFreeze } from '../../shared';
import { createTableStructureContext } from './context';
import { validateTableStructureOutput } from './validate';

const errorMessageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const createSemanticTableModel = (output: TableStructureOutput): SemanticTableModel =>
  deepFreeze({
    rows: output.rows.map((row, index) => ({ ...row, index })),
    columns: output.columns.map((column, index) => ({ ...column, index })),
    cells: output.cells.map(cell => ({
      id: cell.id,
      rowId: output.rows[cell.row].id,
      columnId: output.columns[cell.column].id,
      rowIndex: cell.row,
      columnIndex: cell.column,
      location: cell.location,
      roles: cell.roles,
      payload: cell.payload,
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
    const jsonOperation = JsonObjectSchema.parse(operation);
    const parsedOperation = TableStructureSchema.parse(jsonOperation);
    const registry = resolveTableStructureRegistry(options.structureDefinitions);
    const definition = tableStructureDefinitionOf(parsedOperation.kind, registry);
    const preciseOperation = definition.schema.parse(jsonOperation);
    JsonObjectSchema.parse(preciseOperation);
    const context = createTableStructureContext(options.data, options.datasets ?? {});
    const providerOutput = definition.build(preciseOperation as never, context);
    const jsonOutput = JsonObjectSchema.parse(providerOutput);
    const output = deepFreeze(TableStructureOutputSchema.parse(jsonOutput));
    validateTableStructureOutput(output, parsedOperation, context);
    return createSemanticTableModel(output);
  } catch (error) {
    throw new Error(`${prefix}: ${errorMessageOf(error)}`, { cause: error });
  }
};
