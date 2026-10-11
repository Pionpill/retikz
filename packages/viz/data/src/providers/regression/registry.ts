import type {
  AnyRegressionDefinition,
  RegressionResolution,
  AnyRegressionImplementation,
  AnySynchronousRegressionImplementation,
} from '../../contract';
import { extractRegressionKind } from '../../contract';
import type { DataTransformDependency } from '../../contract';
import { RetikzDataError } from '../../error';
import type { IRRegressionMethod } from '../../schemas';
import { resolveImplementationRegistry } from '../shared';
import { BUILTIN_REGRESSIONS, BUILTIN_REGRESSION_IMPLEMENTATIONS } from './definitions';

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
): DataTransformDependency => {
  return regressionBoundary(operation, () => {
    const definition = registry.get(operation.kind);
    if (definition === undefined) throw new RetikzDataError(`data: regression "${operation.kind}" is not registered`);

    const parsed = definition.schema.parse(operation) as IRRegressionMethod;

    return { type: 'regression', operation: parsed, definition };
  });
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
      { cause, regressionMethod: method },
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
  const definition = registry.get(method.kind);
  if (definition === undefined)
    throw new RetikzDataError(`data: regression "${method.kind}" is not registered; pass regressionDefinitions`, {
      regressionMethod: method,
    });

  return regressionBoundary(method, () => {
    const operation = definition.schema.parse(method) as never;
    return {
      validateExtent: extent => regressionBoundary(method, () => definition.validateExtent?.(operation, extent)),
      fit: pairs =>
        regressionBoundary(method, () => {
          const implementation = implementations.get(method.kind);
          if (implementation === undefined)
            throw new RetikzDataError(`data: regression "${method.kind}" has no local implementation`);

          const model = implementation.fit(pairs, operation);

          return {
            predict: x =>
              regressionBoundary(method, () => {
                const prediction = model.predict(x);
                if (!Number.isFinite(prediction))
                  throw new RetikzDataError(`data: regression "${method.kind}" produced a non-finite prediction`);

                return prediction;
              }),
          };
        }),
    };
  });
};
