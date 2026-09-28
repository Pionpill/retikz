import type { AnyRegressionDefinition, RegressionResolution } from '../../contract';
import { extractRegressionKind } from '../../contract';
import { RetikzDataError } from '../../error';
import type { IRRegressionMethod } from '../../schemas';
import { BUILTIN_REGRESSIONS } from './definitions';

/** 建立本次运行的拟合 registry，重复键明确失败 */
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

/** 精确解析一次方法参数，返回可供多个分组消费的拟合入口 */
export const resolveRegression = (
  method: IRRegressionMethod,
  registry: ReadonlyMap<string, AnyRegressionDefinition> = resolveRegressionRegistry(),
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
          const model = definition.fit(pairs, operation);
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
