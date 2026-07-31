import { ChildSchema, JsonObjectSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';

import type {
  AnyCellFormatterDefinition,
  FormattedTableCell,
  FormattedTableModel,
  SemanticTableCell,
  SemanticTableModel,
  TableCellContext,
} from '../../contract';

import { cellFormatterDefinitionOf, resolveCellFormatterRegistry } from '../../providers';
import { TableCellPayloadKind, TableCellPayloadSchema } from '../../schemas';
import { deepFreeze } from '../../shared';

const errorMessageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** 从 canonical Cell 构造 detached、递归冻结的 formatter context */
const formatterContextOf = (cell: SemanticTableCell): TableCellContext =>
  deepFreeze({
    cellId: cell.id,
    rowId: cell.rowId,
    columnId: cell.columnId,
    rowIndex: cell.rowIndex,
    columnIndex: cell.columnIndex,
    location: cell.location,
    roles: [...cell.roles],
    ...(cell.source === undefined ? {} : { source: { ...cell.source } }),
  });

/** 把单个 canonical Cell 转换为 formatter 阶段结果 */
const formatCell = (
  cell: SemanticTableCell,
  registry: ReadonlyMap<string, AnyCellFormatterDefinition>,
): FormattedTableCell => {
  const parsedPayload = TableCellPayloadSchema.parse(cell.payload);
  if (parsedPayload.kind === TableCellPayloadKind.Content) {
    return deepFreeze({
      kind: TableCellPayloadKind.Content,
      cellId: cell.id,
      content: ChildSchema.parse(parsedPayload.content),
    });
  }

  const name = parsedPayload.formatter?.name ?? 'identity';
  const prefix = `table: formatter "${name}" for cell "${cell.id}"`;
  try {
    const definition = cellFormatterDefinitionOf(name, registry);
    const rawOptions = JsonObjectSchema.parse(parsedPayload.formatter?.options ?? {});
    const parsedOptions = definition.optionsSchema.parse(rawOptions);
    const guardedOptions = JsonObjectSchema.parse(parsedOptions);
    const context = formatterContextOf(cell);
    const value = ScalarValueSchema.parse(
      definition.format({ value: parsedPayload.value, context }, guardedOptions as never),
    );
    return deepFreeze({
      kind: TableCellPayloadKind.Value,
      cellId: cell.id,
      rawValue: parsedPayload.value,
      value,
      formatterName: name,
    });
  } catch (error) {
    throw new Error(`${prefix}: ${errorMessageOf(error)}`, { cause: error });
  }
};

/** 把 canonical Table Cells 格式化为同 identity、同顺序的展示值模型 */
export const formatTable = (
  model: SemanticTableModel,
  definitions?: ReadonlyArray<AnyCellFormatterDefinition>,
): FormattedTableModel => {
  const registry = resolveCellFormatterRegistry(definitions);
  const cells = Object.freeze(model.cells.map(cell => formatCell(cell, registry)));
  return Object.freeze({ semantic: model, cells });
};
