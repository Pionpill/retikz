import { createReadonlyMap } from '@retikz/foundation';

import { RetikzDataError } from '../../error';
import type { ExternalRow } from '../../shared';
import { resolveImplementationRegistry } from '../../shared';
import type { DataTransformDependency, TransformContext } from '../../transform';
import { extractStatisticOperation } from '../registry';
import type {
  AnyRowSelectorDefinition,
  AnyRowSelectorImplementation,
  AnySynchronousRowSelectorImplementation,
  RowSelection,
} from './contract';
import { BUILTIN_ROW_SELECTOR_IMPLEMENTATIONS, BUILTIN_ROW_SELECTORS } from './definitions';
import type { IRDataSelectorOperation } from './schema';

/**
 * 注册独立选择计算
 * @template TImplementation 自定义行选择实现类型，默认限定同步选择结果
 * @param definitions 已注册的语义定义；省略时使用内置定义注册表
 * @param custom 自定义计算实现；省略时仅注册内置实现
 * @returns 名称到计算实现的映射，保留同步与异步结果类型
 * @throws {RetikzDataError} 实现重复、对应定义未注册或 Definition 对象身份不一致
 */
export const resolveRowSelectorImplementationRegistry = <
  TImplementation extends AnyRowSelectorImplementation = AnySynchronousRowSelectorImplementation,
>(
  definitions: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
  custom: ReadonlyArray<TImplementation> = [],
): Map<string, TImplementation | AnySynchronousRowSelectorImplementation> =>
  resolveImplementationRegistry(
    definitions,
    [...BUILTIN_ROW_SELECTOR_IMPLEMENTATIONS, ...custom],
    extractStatisticOperation,
  );

/** 默认 row selector registry 的私有稳定索引 */
const BUILTIN_ROW_SELECTOR_REGISTRY = createReadonlyMap(
  BUILTIN_ROW_SELECTORS.map(def => [extractStatisticOperation(def.schema), def] as const),
);

/**
 * 合并内置与自定义 row selector 定义，并集中检查 kind 冲突
 * @param custom 自定义语义定义；省略时仅注册内置定义
 * @returns 每次调用独立创建的名称到定义映射
 * @throws {RetikzDataError} 注册名称重复或定义的 kind 不符合要求
 */
export const resolveRowSelectorRegistry = (
  custom?: ReadonlyArray<AnyRowSelectorDefinition>,
): Map<string, AnyRowSelectorDefinition> => {
  const registry = new Map(BUILTIN_ROW_SELECTOR_REGISTRY);

  for (const def of custom ?? []) {
    const kind = extractStatisticOperation(def.schema);
    if (registry.has(kind)) throw new RetikzDataError(`data: duplicate row selector registration: "${kind}"`);
    registry.set(kind, def);
  }

  return registry;
};

/** 用选中的 definition schema 收窄 selector operation */
const parseSelectorOperation = (definition: AnyRowSelectorDefinition, operation: IRDataSelectorOperation): never =>
  definition.schema.parse(operation) as never;

/** 从注册表解析 selector 定义；缺失时给出注入入口提示 */
const selectorDefinitionOf = (
  operation: IRDataSelectorOperation,
  registry: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
): AnyRowSelectorDefinition => {
  const definition = registry.get(operation.kind);
  if (definition === undefined) {
    throw new RetikzDataError(
      `data: selector kind "${operation.kind}" is not registered; pass a RowSelectorDefinition via options.rowSelectorDefinitions`,
    );
  }

  return definition;
};

/** 解析精确 selector 依赖，不执行选行 */
export const resolveSelectorDependency = (
  operation: IRDataSelectorOperation,
  registry: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
): DataTransformDependency => {
  const definition = selectorDefinitionOf(operation, registry);
  return { type: 'selector', operation: definition.schema.parse(operation) as IRDataSelectorOperation, definition };
};

/** 收集 selector 会读取的源字段 */
export const selectorInputFields = (
  operation: IRDataSelectorOperation,
  registry: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
): Array<string> => {
  const definition = selectorDefinitionOf(operation, registry);
  return definition.inputFields?.(parseSelectorOperation(definition, operation)) ?? [];
};

/** 精确解析 selector operation，返回本次请求内可供多个分组复用的计算入口 */
export const resolveSelectorComputation = (
  operation: IRDataSelectorOperation,
  context: TransformContext,
): ((rows: Array<ExternalRow>) => Array<RowSelection>) => {
  const registry = context.rowSelectorRegistry ?? resolveRowSelectorRegistry();
  const definition = selectorDefinitionOf(operation, registry);
  const parsed = parseSelectorOperation(definition, operation);
  const implementation = (
    context.rowSelectorImplementationRegistry ??
    resolveRowSelectorImplementationRegistry<AnySynchronousRowSelectorImplementation>(registry)
  ).get(operation.kind);
  if (implementation === undefined)
    throw new RetikzDataError(`data: selector "${operation.kind}" has no local implementation`);

  return rows => {
    let out: Array<RowSelection>;

    try {
      out = implementation.select(rows, parsed);
    } catch (cause) {
      throw new RetikzDataError(`data: selector "${operation.kind}" failed`, { cause });
    }

    context.lineage?.recordSelectorOperation({
      operation,
      rows,
      selectedRows: out.map(selection => selection.row),
      inputFields: definition.inputFields?.(parsed) ?? [],
    });

    return out;
  };
};

/** 独立调用时解析参数后执行一次计算 */
export const applySelectorOperation = (
  rows: Array<ExternalRow>,
  operation: IRDataSelectorOperation,
  context: TransformContext,
): Array<RowSelection> => resolveSelectorComputation(operation, context)(rows);
