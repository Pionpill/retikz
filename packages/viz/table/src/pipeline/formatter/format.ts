import type { IRChild } from '@retikz/core';

import type {
  AnyCellFormatterDefinition,
  FormattedTableCell,
  FormattedTableModel,
  SemanticTableCell,
  SemanticTableModel,
  TableCellContext,
} from '../../contract';
import { RetikzTableError } from '../../error';
import { cellFormatterDefinitionOf, resolveCellFormatterRegistry } from '../../providers';
import { TableCellPayloadKind } from '../../schemas';
import { deepFreeze } from '../../shared';
import type { TableCellPlanResolution } from '../rule';

const errorMessageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** 把单个 canonical Cell 转换为 formatter 阶段结果 */
const formatCell = (
  cell: SemanticTableCell,
  plan: TableCellPlanResolution,
  registry: ReadonlyMap<string, AnyCellFormatterDefinition>,
): FormattedTableCell => {
  /** 从 canonical Cell 构造 detached、递归冻结的 formatter context */
  const formatterContextOf = (sourceCell: SemanticTableCell): TableCellContext =>
    deepFreeze({
      ...(sourceCell.id === undefined ? {} : { cellId: sourceCell.id }),
      ...(sourceCell.rowId === undefined ? {} : { rowId: sourceCell.rowId }),
      ...(sourceCell.columnId === undefined ? {} : { columnId: sourceCell.columnId }),
      rowIndex: sourceCell.rowIndex,
      columnIndex: sourceCell.columnIndex,
      location: sourceCell.location,
      roles: [...sourceCell.roles],
      ...(sourceCell.source === undefined ? {} : { source: { ...sourceCell.source } }),
    });

  const parsedPayload = cell.payload;
  if (parsedPayload.kind === TableCellPayloadKind.Content) {
    return deepFreeze({
      kind: TableCellPayloadKind.Content,
      ...(cell.id === undefined ? {} : { cellId: cell.id }),
      // Source 已校验；独立副本解除 semantic model 的只读投影，不再次 parse
      content: structuredClone(parsedPayload.content) as IRChild,
    });
  }

  const cellLabel = cell.id === undefined ? `${cell.rowIndex}:${cell.columnIndex}` : `"${cell.id}"`;
  if (plan.kind !== TableCellPayloadKind.Value) {
    throw new RetikzTableError(`table: formatter plan for Cell ${cellLabel} kind differs`);
  }

  const name = plan.formatter.name;
  const prefix = `table: formatter "${name}" for cell ${cellLabel}`;

  try {
    const definition = cellFormatterDefinitionOf(name, registry);
    const parsedOptions = deepFreeze(definition.optionsSchema.parse(plan.formatter.options ?? {}));
    const context = formatterContextOf(cell);
    const value = definition.format({ value: parsedPayload.value, context }, parsedOptions as never);

    return deepFreeze({
      kind: TableCellPayloadKind.Value,
      ...(cell.id === undefined ? {} : { cellId: cell.id }),
      rawValue: parsedPayload.value,
      value,
      formatterName: name,
    });
  } catch (error) {
    throw new RetikzTableError(`${prefix}: ${errorMessageOf(error)}`, { cause: error });
  }
};

/** formatter 阶段消费的 canonical-order-aligned Cell plans */
type FormatTableOptions = Readonly<{
  /** 与 canonical Cells 等长同序，显式 id 也必须一致的 resolved plans */
  cells: ReadonlyArray<TableCellPlanResolution>;
  /** 用户自定义 Cell formatter definitions */
  formatterDefinitions?: ReadonlyArray<AnyCellFormatterDefinition>;
}>;

/** 把 canonical Table Cells 格式化为同 identity、同顺序的展示值模型 */
export const formatTable = (model: SemanticTableModel, options: FormatTableOptions): FormattedTableModel => {
  /** 校验 formatter plans 与 canonical Cells 同长同序，并校验显式 identity / kind */
  const assertPlanAlignment = (
    sourceModel: SemanticTableModel,
    plans: ReadonlyArray<TableCellPlanResolution>,
  ): void => {
    if (sourceModel.cells.length !== plans.length)
      throw new RetikzTableError('table: formatter plan Cell count differs from semantic model');

    sourceModel.cells.forEach((cell, index) => {
      const plan = plans[index];
      if (plan.cellId !== cell.id) throw new RetikzTableError(`table: formatter plan Cell ${index} identity differs`);
      if (plan.kind !== cell.payload.kind)
        throw new RetikzTableError(`table: formatter plan Cell ${index} kind differs`);
    });
  };

  assertPlanAlignment(model, options.cells);
  const semantic = deepFreeze(structuredClone(model));
  const registry = resolveCellFormatterRegistry(options.formatterDefinitions);
  const cells = Object.freeze(semantic.cells.map((cell, index) => formatCell(cell, options.cells[index], registry)));

  return Object.freeze({ semantic, cells });
};
