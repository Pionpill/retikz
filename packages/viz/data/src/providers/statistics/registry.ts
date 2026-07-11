import { JsonObjectSchema } from '@retikz/core';

import type {
  AnyRowSelectorDefinition,
  AnyStatisticsReducerDefinition,
  RowSelection,
  TransformContext,
} from '../../contract';

import { extractStatisticOperation } from '../../contract';
import { type ExternalRow, type IRDataReducerOperation, type IRDataSelectorOperation } from '../../schemas';
import { ReducerOperationSchema, SelectorOperationSchema } from '../../schemas';
import { BUILTIN_STATISTICS_REDUCERS } from './reducers';
import { BUILTIN_ROW_SELECTORS } from './selectors';

export { BUILTIN_STATISTICS_REDUCERS } from './reducers';
export { BUILTIN_ROW_SELECTORS } from './selectors';

/** 合并内置与自定义统计 reducer 定义，并集中检查 kind 冲突。 */
export const resolveStatisticsReducerRegistry = (
  custom?: ReadonlyArray<AnyStatisticsReducerDefinition>,
): Map<string, AnyStatisticsReducerDefinition> => {
  const registry = new Map<string, AnyStatisticsReducerDefinition>();
  for (const def of BUILTIN_STATISTICS_REDUCERS) registry.set(extractStatisticOperation(def.schema), def);
  for (const def of custom ?? []) {
    const kind = extractStatisticOperation(def.schema);
    if (registry.has(kind)) throw new Error(`data: duplicate statistics reducer registration: "${kind}"`);
    registry.set(kind, def);
  }
  return registry;
};

/** 合并内置与自定义 row selector 定义，并集中检查 kind 冲突。 */
export const resolveRowSelectorRegistry = (
  custom?: ReadonlyArray<AnyRowSelectorDefinition>,
): Map<string, AnyRowSelectorDefinition> => {
  const registry = new Map<string, AnyRowSelectorDefinition>();
  for (const def of BUILTIN_ROW_SELECTORS) registry.set(extractStatisticOperation(def.schema), def);
  for (const def of custom ?? []) {
    const kind = extractStatisticOperation(def.schema);
    if (registry.has(kind)) throw new Error(`data: duplicate row selector registration: "${kind}"`);
    registry.set(kind, def);
  }
  return registry;
};

/** 依次用公开契约与 definition schema 收窄 reducer operation，并保证解析结果仍可 JSON 序列化。 */
const parseReducerOperation = (
  definition: AnyStatisticsReducerDefinition,
  operation: IRDataReducerOperation,
): never => {
  const publicOperation = ReducerOperationSchema.parse(operation);
  const parsed = definition.schema.parse(publicOperation) as never;
  JsonObjectSchema.parse(parsed);
  return parsed;
};

/** 依次用公开契约与 definition schema 收窄 selector operation，并保证解析结果仍可 JSON 序列化。 */
const parseSelectorOperation = (definition: AnyRowSelectorDefinition, operation: IRDataSelectorOperation): never => {
  const publicOperation = SelectorOperationSchema.parse(operation);
  const parsed = definition.schema.parse(publicOperation) as never;
  JsonObjectSchema.parse(parsed);
  return parsed;
};

/** 从注册表解析 reducer 定义；缺失时给出注入入口提示。 */
const reducerDefinitionOf = (
  operation: IRDataReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): AnyStatisticsReducerDefinition => {
  const definition = registry.get(operation.kind);
  if (definition === undefined) {
    throw new Error(
      `data: reducer kind "${operation.kind}" is not registered; pass a StatisticsReducerDefinition via options.statisticsReducerDefinitions`,
    );
  }
  return definition;
};

/** 从注册表解析 selector 定义；缺失时给出注入入口提示。 */
const selectorDefinitionOf = (
  operation: IRDataSelectorOperation,
  registry: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
): AnyRowSelectorDefinition => {
  const definition = registry.get(operation.kind);
  if (definition === undefined) {
    throw new Error(
      `data: selector kind "${operation.kind}" is not registered; pass a RowSelectorDefinition via options.rowSelectorDefinitions`,
    );
  }
  return definition;
};

/** 收集 reducer 会读取的源字段。 */
export const reducerInputFields = (
  operation: IRDataReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): Array<string> => {
  const definition = reducerDefinitionOf(operation, registry);
  return definition.inputFields?.(parseReducerOperation(definition, operation)) ?? [];
};

/** 收集 reducer 会产生的派生字段。 */
export const reducerOutputFields = (
  operation: IRDataReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): Array<string> => {
  const definition = reducerDefinitionOf(operation, registry);
  return definition.outputFields?.(parseReducerOperation(definition, operation)) ?? [];
};

/** 对一组 rows 执行 reducer operation，并允许 context 注入自定义 reducer registry。 */
export const applyReducerOperation = (
  rows: Array<ExternalRow>,
  operation: IRDataReducerOperation,
  context: TransformContext,
): ExternalRow => {
  const registry = context.statisticsReducerRegistry ?? resolveStatisticsReducerRegistry();
  const definition = reducerDefinitionOf(operation, registry);
  const parsed = parseReducerOperation(definition, operation);
  const out = definition.reduce(rows, parsed, context);
  context.lineage?.recordReducerOperation({
    operation,
    rows,
    inputFields: definition.inputFields?.(parsed) ?? [],
    outputFields: definition.outputFields?.(parsed) ?? [],
  });
  return out;
};

/** 收集 selector 会读取的源字段。 */
export const selectorInputFields = (
  operation: IRDataSelectorOperation,
  registry: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
): Array<string> => {
  const definition = selectorDefinitionOf(operation, registry);
  return definition.inputFields?.(parseSelectorOperation(definition, operation)) ?? [];
};

/** 对一组 rows 执行 selector operation，并允许 context 注入自定义 selector registry。 */
export const applySelectorOperation = (
  rows: Array<ExternalRow>,
  operation: IRDataSelectorOperation,
  context: TransformContext,
): Array<RowSelection> => {
  const registry = context.rowSelectorRegistry ?? resolveRowSelectorRegistry();
  const definition = selectorDefinitionOf(operation, registry);
  const parsed = parseSelectorOperation(definition, operation);
  const out = definition.select(rows, parsed);
  context.lineage?.recordSelectorOperation({
    operation,
    rows,
    selectedRows: out.map(selection => selection.row),
    inputFields: definition.inputFields?.(parsed) ?? [],
  });
  return out;
};
