import { createReadonlyMap } from '@retikz/foundation';

import { RetikzDataError } from '../../error';
import type { ExternalRow } from '../../shared';
import { resolveImplementationRegistry } from '../../shared';
import type { DataTransformDependency, DataTransformOutputDescriptor, TransformContext } from '../../transform';
import { extractStatisticOperation } from '../registry';
import type {
  AnyStatisticsReducerDefinition,
  AnyStatisticsReducerImplementation,
  AnySynchronousStatisticsReducerImplementation,
} from './contract';
import { BUILTIN_STATISTICS_REDUCER_IMPLEMENTATIONS, BUILTIN_STATISTICS_REDUCERS } from './definitions';
import type { IRDataReducerOperation } from './schema';

/**
 * 注册独立统计计算，不以 kind 猜测语义等价
 * @template TImplementation 自定义归约实现类型，默认限定同步数据行结果
 * @param definitions 已注册的语义定义；省略时使用内置定义注册表
 * @param custom 自定义计算实现；省略时仅注册内置实现
 * @returns 名称到计算实现的映射，保留同步与异步结果类型
 * @throws {RetikzDataError} 实现重复、对应定义未注册或 Definition 对象身份不一致
 */
export const resolveStatisticsReducerImplementationRegistry = <
  TImplementation extends AnyStatisticsReducerImplementation = AnySynchronousStatisticsReducerImplementation,
>(
  definitions: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
  custom: ReadonlyArray<TImplementation> = [],
): Map<string, TImplementation | AnySynchronousStatisticsReducerImplementation> =>
  resolveImplementationRegistry(
    definitions,
    [...BUILTIN_STATISTICS_REDUCER_IMPLEMENTATIONS, ...custom],
    extractStatisticOperation,
  );

/** 默认 statistics reducer registry 的私有稳定索引 */
const BUILTIN_STATISTICS_REDUCER_REGISTRY = createReadonlyMap(
  BUILTIN_STATISTICS_REDUCERS.map(def => [extractStatisticOperation(def.schema), def] as const),
);

/**
 * 合并内置与自定义统计 reducer 定义，并集中检查 kind 冲突
 * @param custom 自定义语义定义；省略时仅注册内置定义
 * @returns 每次调用独立创建的名称到定义映射
 * @throws {RetikzDataError} 注册名称重复或定义的 kind 不符合要求
 */
export const resolveStatisticsReducerRegistry = (
  custom?: ReadonlyArray<AnyStatisticsReducerDefinition>,
): Map<string, AnyStatisticsReducerDefinition> => {
  const registry = new Map(BUILTIN_STATISTICS_REDUCER_REGISTRY);

  for (const def of custom ?? []) {
    const kind = extractStatisticOperation(def.schema);
    if (registry.has(kind)) throw new RetikzDataError(`data: duplicate statistics reducer registration: "${kind}"`);
    registry.set(kind, def);
  }

  return registry;
};

/** 用选中的 definition schema 收窄 reducer operation */
const parseReducerOperation = (definition: AnyStatisticsReducerDefinition, operation: IRDataReducerOperation): never =>
  definition.schema.parse(operation) as never;

/** 从注册表解析 reducer 定义；缺失时给出注入入口提示 */
const reducerDefinitionOf = (
  operation: IRDataReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): AnyStatisticsReducerDefinition => {
  const definition = registry.get(operation.kind);
  if (definition === undefined) {
    throw new RetikzDataError(
      `data: reducer kind "${operation.kind}" is not registered; pass a StatisticsReducerDefinition via options.statisticsReducerDefinitions`,
    );
  }

  return definition;
};

/** 解析精确 reducer 依赖，不执行统计计算 */
export const resolveReducerDependency = (
  operation: IRDataReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): DataTransformDependency => {
  const definition = reducerDefinitionOf(operation, registry);
  return { type: 'reducer', operation: definition.schema.parse(operation) as IRDataReducerOperation, definition };
};

/** 收集 reducer 会读取的源字段 */
export const reducerInputFields = (
  operation: IRDataReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): Array<string> => {
  const definition = reducerDefinitionOf(operation, registry);
  return definition.inputFields?.(parseReducerOperation(definition, operation)) ?? [];
};

/** 收集 reducer 会产生的派生字段 */
export const reducerOutputFields = (
  operation: IRDataReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): Array<string> => {
  const definition = reducerDefinitionOf(operation, registry);
  const parsed = parseReducerOperation(definition, operation);
  return definition.outputs(parsed).map(descriptor => descriptor.field);
};

/** 解析reducer Definition声明的已类型化scalar输出 */
export const reducerOutputDescriptors = (
  operation: IRDataReducerOperation,
  registry: ReadonlyMap<string, AnyStatisticsReducerDefinition> = resolveStatisticsReducerRegistry(),
): Array<DataTransformOutputDescriptor> => {
  const definition = reducerDefinitionOf(operation, registry);
  return definition.outputs(parseReducerOperation(definition, operation));
};

/** 对一组 rows 执行 reducer operation，并允许 context 注入自定义 reducer registry */
export const applyReducerOperation = (
  rows: Array<ExternalRow>,
  operation: IRDataReducerOperation,
  context: TransformContext,
): ExternalRow => {
  const registry = context.statisticsReducerRegistry ?? resolveStatisticsReducerRegistry();
  const definition = reducerDefinitionOf(operation, registry);
  const parsed = parseReducerOperation(definition, operation);
  const implementation = (
    context.statisticsReducerImplementationRegistry ??
    resolveStatisticsReducerImplementationRegistry<AnySynchronousStatisticsReducerImplementation>(registry)
  ).get(operation.kind);
  if (implementation === undefined)
    throw new RetikzDataError(`data: reducer "${operation.kind}" has no local implementation`);

  let out: ExternalRow;

  try {
    out = implementation.reduce(rows, parsed, context);
  } catch (cause) {
    throw new RetikzDataError(`data: reducer "${operation.kind}" failed`, { cause });
  }

  const outputFields = definition.outputs(parsed).map(descriptor => descriptor.field);
  context.lineage?.recordReducerOperation({
    operation,
    rows,
    inputFields: definition.inputFields?.(parsed) ?? [],
    outputFields,
  });

  return out;
};
