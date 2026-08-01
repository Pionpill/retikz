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
import type { ResolvedTableCellPlan } from '../rule';

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
  plan: ResolvedTableCellPlan,
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

  if (plan.kind !== TableCellPayloadKind.Value) {
    throw new Error(`table: formatter plan for Cell "${cell.id}" kind differs`);
  }
  const name = plan.formatter.name;
  const prefix = `table: formatter "${name}" for cell "${cell.id}"`;
  try {
    const definition = cellFormatterDefinitionOf(name, registry);
    const rawOptions = JsonObjectSchema.parse(plan.formatter.options ?? {});
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

/** formatter 阶段消费的严格 identity-aligned Cell plans */
export type FormatTableOptions = Readonly<{
  /** 与 canonical Cells 等长、同序、同 identity 的 resolved plans */
  cells: ReadonlyArray<ResolvedTableCellPlan>;
  /** 用户自定义 Cell formatter definitions */
  formatterDefinitions?: ReadonlyArray<AnyCellFormatterDefinition>;
}>;

/** 校验 formatter plans 与 canonical Cells 同长、同序、同 identity / kind */
const assertPlanAlignment = (model: SemanticTableModel, plans: ReadonlyArray<ResolvedTableCellPlan>): void => {
  if (model.cells.length !== plans.length)
    throw new Error('table: formatter plan Cell count differs from semantic model');
  model.cells.forEach((cell, index) => {
    const plan = plans[index];
    if (plan.cellId !== cell.id) throw new Error(`table: formatter plan Cell ${index} identity differs`);
    if (plan.kind !== cell.payload.kind) throw new Error(`table: formatter plan Cell ${index} kind differs`);
  });
};

/** 把 canonical Table Cells 格式化为同 identity、同顺序的展示值模型 */
export const formatTable = (model: SemanticTableModel, options: FormatTableOptions): FormattedTableModel => {
  assertPlanAlignment(model, options.cells);
  const semantic = deepFreeze(structuredClone(model));
  const registry = resolveCellFormatterRegistry(options.formatterDefinitions);
  const cells = Object.freeze(semantic.cells.map((cell, index) => formatCell(cell, options.cells[index], registry)));
  return Object.freeze({ semantic, cells });
};
