import type {
  AnyRowSelectorDefinition,
  AnyStatisticsReducerDefinition,
  RowSelection,
  TransformContext,
} from '../../contract';

import { extractStatisticOperation } from '../../contract';
import { type ExternalRow, type ReducerOperation, type SelectorOperation } from '../../schemas';
import { BUILTIN_STATISTICS_REDUCERS } from './reducers';
import { BUILTIN_ROW_SELECTORS } from './selectors';

export { BUILTIN_STATISTICS_REDUCERS } from './reducers';
export { BUILTIN_ROW_SELECTORS } from './selectors';

/** 合并内置与自定义统计 reducer 定义，并集中检查 op 冲突。 */
export const resolveStatisticsReducerRegistry = (
  custom?: ReadonlyArray<AnyStatisticsReducerDefinition>,
): Map<string, AnyStatisticsReducerDefinition> => {
  const registry = new Map<string, AnyStatisticsReducerDefinition>();
  for (const def of BUILTIN_STATISTICS_REDUCERS) registry.set(extractStatisticOperation(def.schema), def);
  for (const def of custom ?? []) {
    const op = extractStatisticOperation(def.schema);
    if (registry.has(op)) throw new Error(`data: duplicate statistics reducer registration: "${op}"`);
    registry.set(op, def);
  }
  return registry;
};

/** 合并内置与自定义 row selector 定义，并集中检查 op 冲突。 */
export const resolveRowSelectorRegistry = (
  custom?: ReadonlyArray<AnyRowSelectorDefinition>,
): Map<string, AnyRowSelectorDefinition> => {
  const registry = new Map<string, AnyRowSelectorDefinition>();
  for (const def of BUILTIN_ROW_SELECTORS) registry.set(extractStatisticOperation(def.schema), def);
  for (const def of custom ?? []) {
    const op = extractStatisticOperation(def.schema);
    if (registry.has(op)) throw new Error(`data: duplicate row selector registration: "${op}"`);
    registry.set(op, def);
  }
  return registry;
};

/** 用 definition schema 收窄 reducer operation；调用 reduce 前必须先解析。 */
const parseReducerOperation = (definition: AnyStatisticsReducerDefinition, operation: ReducerOperation): never =>
  definition.schema.parse(operation) as never;

/** 用 definition schema 收窄 selector operation；调用 select 前必须先解析。 */
const parseSelectorOperation = (definition: AnyRowSelectorDefinition, operation: SelectorOperation): never =>
  definition.schema.parse(operation) as never;

/** 从注册表解析 reducer 定义；缺失时给出注入入口提示。 */
const reducerDefinitionOf = (
  operation: ReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): AnyStatisticsReducerDefinition => {
  const definition = registry.get(operation.op);
  if (definition === undefined) {
    throw new Error(
      `data: reducer op "${operation.op}" is not registered; pass a StatisticsReducerDefinition via options.statisticsReducerDefinitions`,
    );
  }
  return definition;
};

/** 从注册表解析 selector 定义；缺失时给出注入入口提示。 */
const selectorDefinitionOf = (
  operation: SelectorOperation,
  registry: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
): AnyRowSelectorDefinition => {
  const definition = registry.get(operation.op);
  if (definition === undefined) {
    throw new Error(
      `data: selector op "${operation.op}" is not registered; pass a RowSelectorDefinition via options.rowSelectorDefinitions`,
    );
  }
  return definition;
};

/** 收集 reducer 会读取的源字段。 */
export const reducerInputFields = (
  operation: ReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): Array<string> => {
  const definition = reducerDefinitionOf(operation, registry);
  return definition.inputFields?.(parseReducerOperation(definition, operation)) ?? [];
};

/** 收集 reducer 会产生的派生字段。 */
export const reducerOutputFields = (
  operation: ReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): Array<string> => {
  const definition = reducerDefinitionOf(operation, registry);
  return definition.outputFields?.(parseReducerOperation(definition, operation)) ?? [];
};

/** 对一组 rows 执行 reducer operation，并允许 context 注入自定义 reducer registry。 */
export const applyReducerOperation = (
  rows: Array<ExternalRow>,
  operation: ReducerOperation,
  context: TransformContext,
): ExternalRow => {
  const registry = context.statisticsReducerRegistry ?? resolveStatisticsReducerRegistry();
  const definition = reducerDefinitionOf(operation, registry);
  return definition.reduce(rows, parseReducerOperation(definition, operation), context);
};

/** 收集 selector 会读取的源字段。 */
export const selectorInputFields = (
  operation: SelectorOperation,
  registry: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
): Array<string> => {
  const definition = selectorDefinitionOf(operation, registry);
  return definition.inputFields?.(parseSelectorOperation(definition, operation)) ?? [];
};

/** 对一组 rows 执行 selector operation，并允许 context 注入自定义 selector registry。 */
export const applySelectorOperation = (
  rows: Array<ExternalRow>,
  operation: SelectorOperation,
  context: Pick<TransformContext, 'rowSelectorRegistry'>,
): Array<RowSelection> => {
  const registry = context.rowSelectorRegistry ?? resolveRowSelectorRegistry();
  const definition = selectorDefinitionOf(operation, registry);
  return definition.select(rows, parseSelectorOperation(definition, operation));
};
