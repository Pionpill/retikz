import { RetikzDataError } from '../../error';
import { resolveImplementationRegistry } from '../../shared';
import type {
  AnyRegressionDefinition,
  AnyRegressionImplementation,
  AnySynchronousRegressionImplementation,
  RegressionResolution,
  RegressionDependency,
  RegressionFitOptions,
  RegressionModel,
  RegressionPair,
} from './contract';
import { extractRegressionKind } from './contract';
import { BUILTIN_REGRESSION_IMPLEMENTATIONS, BUILTIN_REGRESSIONS } from './definitions';
import type { IRRegressionMethod } from './schema';

/**
 * 注册独立拟合计算
 * @template TImplementation 自定义拟合实现类型，默认限定同步模型结果
 * @param definitions 已注册的语义定义；省略时使用内置定义注册表
 * @param custom 自定义计算实现；省略时仅注册内置实现
 * @returns 名称到计算实现的映射，保留同步与异步结果类型
 * @throws {RetikzDataError} 实现重复、对应定义未注册或 Definition 对象身份不一致
 */
export const resolveRegressionImplementationRegistry = <
  TImplementation extends AnyRegressionImplementation = AnySynchronousRegressionImplementation,
>(
  definitions: ReadonlyMap<string, AnyRegressionDefinition> = resolveRegressionRegistry(),
  custom: ReadonlyArray<TImplementation> = [],
): Map<string, TImplementation | AnySynchronousRegressionImplementation> =>
  resolveImplementationRegistry(definitions, [...BUILTIN_REGRESSION_IMPLEMENTATIONS, ...custom], extractRegressionKind);

/** 解析拟合语义依赖，不读取观测或执行拟合 */
export const resolveRegressionDependency = (
  operation: IRRegressionMethod,
  registry: ReadonlyMap<string, AnyRegressionDefinition> = resolveRegressionRegistry(),
): RegressionDependency => {
  const prepare = (method: IRRegressionMethod, ancestors: ReadonlyArray<string>): RegressionDependency =>
    regressionBoundary(method, () => {
      if (ancestors.includes(method.kind))
        throw new RetikzDataError(`data: cyclic regression dependency: ${[...ancestors, method.kind].join(' -> ')}`);
      const definition = registry.get(method.kind);
      if (definition === undefined) throw new RetikzDataError(`data: regression "${method.kind}" is not registered`);
      const parsed = definition.schema.parse(method) as IRRegressionMethod;
      const dependencies = (definition.dependencies?.(parsed as never) ?? []).map(child =>
        prepare(child, [...ancestors, method.kind]),
      );
      return { type: 'regression', operation: parsed, definition, dependencies };
    });
  return prepare(operation, []);
};

/**
 * 建立本次运行的拟合 registry，重复键明确失败
 * @param custom 自定义语义定义；省略时仅注册内置定义
 * @returns 每次调用独立创建的名称到定义映射
 * @throws {RetikzDataError} 注册名称重复或定义的 kind 不符合要求
 */
export const resolveRegressionRegistry = (
  custom: ReadonlyArray<AnyRegressionDefinition> = [],
): Map<string, AnyRegressionDefinition> => {
  const registry = new Map<string, AnyRegressionDefinition>();

  for (const definition of [...BUILTIN_REGRESSIONS, ...custom]) {
    const kind = extractRegressionKind(definition.schema);
    if (registry.has(kind)) throw new RetikzDataError(`data: duplicate regression registration: "${kind}"`);
    registry.set(kind, definition);
  }

  return registry;
};

/** 保留自定义回调原始异常，内置 Data 诊断不重复包装 */
const regressionBoundary = <T>(method: IRRegressionMethod, action: () => T): T => {
  try {
    return action();
  } catch (cause) {
    if (cause instanceof RetikzDataError && cause.details.regressionMethod !== undefined) throw cause;

    throw new RetikzDataError(
      `data: regression "${method.kind}" failed${cause instanceof RetikzDataError ? `: ${cause.message}` : ''}`,
      { cause, regressionMethod: method, ...(cause instanceof RetikzDataError ? { code: cause.code } : {}) },
    );
  }
};

/**
 * 精确解析一次方法参数，返回可供多个分组消费的拟合入口
 * @param method 拟合方法与参数
 * @param registry 拟合语义定义；省略时使用内置定义
 * @param implementations 同步拟合实现；省略时按语义注册表建立内置实现映射
 * @returns 参数只解析一次、可用于多个分组的拟合入口
 * @throws {RetikzDataError} 方法未注册或参数解析失败；返回入口在计算失败时也会抛出
 */
export const resolveRegression = (
  method: IRRegressionMethod,
  registry: ReadonlyMap<string, AnyRegressionDefinition> = resolveRegressionRegistry(),
  implementations: ReadonlyMap<
    string,
    AnySynchronousRegressionImplementation
  > = resolveRegressionImplementationRegistry<AnySynchronousRegressionImplementation>(registry),
): RegressionResolution => {
  return resolvePreparedRegression(resolveRegressionDependency(method, registry), implementations);
};

/** 检查完整依赖树的实现身份；不调用拟合回调 */
export const hasRegressionImplementations = (
  dependency: RegressionDependency,
  implementations: ReadonlyMap<string, AnyRegressionImplementation>,
  mode: 'sync' | 'async' = 'async',
): boolean => {
  const implementation = implementations.get(dependency.operation.kind);
  if (implementation === undefined) return false;
  if (implementation.definition !== dependency.definition)
    throw new RetikzDataError(`data: regression "${dependency.operation.kind}" references a different Definition`);
  const dependencyMode = mode === 'async' && implementation.fitAsync !== undefined ? 'async' : 'sync';
  if (dependencyMode === 'sync' && implementation.fit === undefined) return false;
  return dependency.dependencies.every(child => hasRegressionImplementations(child, implementations, dependencyMode));
};

/** 为预测保留方法诊断与用户异常 */
const wrapRegressionModel = (method: IRRegressionMethod, model: RegressionModel): RegressionModel => ({
  predict: x =>
    regressionBoundary(method, () => {
      const value = model.predict(x);
      if (!Number.isFinite(value)) throw new RetikzDataError('data: regression produced a non-finite prediction');
      return value;
    }),
});

/** 在已预检的依赖树上同步执行，不探测 Promise 或重新解析参数 */
const fitPreparedRegression = (
  node: RegressionDependency,
  implementations: ReadonlyMap<string, AnyRegressionImplementation>,
  pairs: ReadonlyArray<RegressionPair>,
  options: RegressionFitOptions,
): RegressionModel =>
  regressionBoundary(node.operation, () => {
    const implementation = implementations.get(node.operation.kind);
    if (implementation?.fit === undefined) throw new RetikzDataError('data: missing prepared synchronous regression');
    if (options.extent !== undefined) node.definition.validateExtent?.(node.operation as never, options.extent);
    const model = implementation.fit(pairs, node.operation as never, {
      ...options,
      fitRegression: (index, observations) => {
        const child = node.dependencies.at(index);
        if (child === undefined || index < 0) throw new RetikzDataError('data: undeclared regression dependency');
        return fitPreparedRegression(child, implementations, observations, options);
      },
    });
    return wrapRegressionModel(node.operation, model);
  });

/** 绑定已解析的同步依赖树，不重复解析候选参数 */
export const resolvePreparedRegression = (
  dependency: RegressionDependency,
  implementations: ReadonlyMap<string, AnySynchronousRegressionImplementation>,
): RegressionResolution => {
  if (!hasRegressionImplementations(dependency, implementations, 'sync'))
    throw new RetikzDataError('data: regression dependency has no local implementation');
  return {
    fit: (pairs, options = {}) => fitPreparedRegression(dependency, implementations, pairs, options),
    validateExtent: extent =>
      regressionBoundary(dependency.operation, () =>
        dependency.definition.validateExtent?.(dependency.operation as never, extent),
      ),
  };
};

/** 绑定异步依赖树；顺序与同步入口相同，异常保留原始原因 */
export const fitPreparedRegressionAsync = async (
  dependency: RegressionDependency,
  implementations: ReadonlyMap<string, AnyRegressionImplementation>,
  pairs: ReadonlyArray<RegressionPair>,
  options: RegressionFitOptions = {},
): Promise<RegressionModel> => {
  try {
    const implementation = implementations.get(dependency.operation.kind);
    if (implementation === undefined) throw new RetikzDataError('data: missing prepared regression');
    if (implementation.fitAsync === undefined)
      return fitPreparedRegression(dependency, implementations, pairs, options);
    if (options.extent !== undefined)
      dependency.definition.validateExtent?.(dependency.operation as never, options.extent);
    const model = await implementation.fitAsync(pairs, dependency.operation as never, {
      ...options,
      fitRegression: (index, observations) => {
        const child = dependency.dependencies.at(index);
        if (child === undefined || index < 0) throw new RetikzDataError('data: undeclared regression dependency');
        return fitPreparedRegressionAsync(child, implementations, observations, options);
      },
    });
    return wrapRegressionModel(dependency.operation, model);
  } catch (cause) {
    return regressionBoundary(dependency.operation, () => {
      throw cause;
    });
  }
};
