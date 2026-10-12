import { RetikzDataError } from '../error';
import { extractStatisticOperation } from '../operators';
import type { AnyStatisticsReducerImplementation, IRDataReducerOperation } from '../operators/reducer';
import { BUILTIN_STATISTICS_REDUCER_IMPLEMENTATIONS, resolveStatisticsReducerRegistry } from '../operators/reducer';
import type { AnyRegressionImplementation } from '../operators/regression';
import { BUILTIN_REGRESSION_IMPLEMENTATIONS, extractRegressionKind } from '../operators/regression';
import type { AnyRowSelectorImplementation, IRDataSelectorOperation } from '../operators/selector';
import { BUILTIN_ROW_SELECTOR_IMPLEMENTATIONS, resolveRowSelectorRegistry } from '../operators/selector';
import type { AnyTransformImplementation, DataTransformStage, TransformContext } from '../transform';
import { createAsyncBuiltinTransformImplementations, extractTransformKind } from '../transform';
import type { DataTransformExecutionOptions } from './contract';

/** 独立计算的注册键；计算前不调用用户回调 */
const indexImplementations = <T extends { definition: { schema: Parameters<typeof extractTransformKind>[0] } }>(
  builtin: ReadonlyArray<T>,
  custom: ReadonlyArray<T>,
  kindOf: typeof extractTransformKind,
): Map<string, T> => {
  const registry = new Map<string, T>();

  for (const implementation of [...builtin, ...custom]) {
    const kind = kindOf(implementation.definition.schema);
    if (registry.has(kind)) throw new RetikzDataError(`data: duplicate implementation registration: "${kind}"`);
    registry.set(kind, implementation);
  }

  return registry;
};

/**
 * 为请求建立本地实现索引，逐阶段固定统计依赖；只有执行时才计算
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 * @param options 本地算子与变换实现配置
 * @param transforms 执行器已建立的变换实现注册表
 * @returns 复用当前请求索引的阶段准备函数，每次执行仍建立独立计算上下文
 */
export const createLocalTransformPreparation = <TSource>(
  options: DataTransformExecutionOptions<TSource>,
  transforms: ReadonlyMap<string, AnyTransformImplementation>,
): ((stage: DataTransformStage) => ((context: TransformContext) => AnyTransformImplementation) | undefined) => {
  const reducers = indexImplementations<AnyStatisticsReducerImplementation>(
    BUILTIN_STATISTICS_REDUCER_IMPLEMENTATIONS,
    options.statisticsReducerImplementations ?? [],
    extractStatisticOperation,
  );
  const selectors = indexImplementations<AnyRowSelectorImplementation>(
    BUILTIN_ROW_SELECTOR_IMPLEMENTATIONS,
    options.rowSelectorImplementations ?? [],
    extractStatisticOperation,
  );
  const regressions = indexImplementations<AnyRegressionImplementation>(
    BUILTIN_REGRESSION_IMPLEMENTATIONS,
    options.regressionImplementations ?? [],
    extractRegressionKind,
  );

  return stage => {
    const transform = transforms.get(stage.operation.kind);
    if (transform === undefined) return undefined;
    if (transform.definition !== stage.definition)
      throw new RetikzDataError(`data: "${stage.operation.kind}" references a different Definition`);

    for (const dependency of stage.dependencies) {
      const implementation =
        dependency.type === 'reducer'
          ? reducers.get(dependency.operation.kind)
          : dependency.type === 'selector'
            ? selectors.get(dependency.operation.kind)
            : regressions.get(dependency.operation.kind);
      if (implementation === undefined) return undefined;
      if (implementation.definition !== dependency.definition)
        throw new RetikzDataError(
          `data: ${dependency.type} "${dependency.operation.kind}" references a different Definition`,
        );
    }

    return context => {
      const reducerDependencies = stage.dependencies.filter(dependency => dependency.type === 'reducer');
      const selectorDependencies = stage.dependencies.filter(dependency => dependency.type === 'selector');
      const reducerDefinitions = resolveStatisticsReducerRegistry([
        ...new Set(
          reducerDependencies.flatMap(dependency =>
            !BUILTIN_STATISTICS_REDUCER_IMPLEMENTATIONS.some(
              implementation => implementation.definition === dependency.definition,
            )
              ? [dependency.definition]
              : [],
          ),
        ),
      ]);
      const selectorDefinitions = resolveRowSelectorRegistry([
        ...new Set(
          selectorDependencies.flatMap(dependency =>
            !BUILTIN_ROW_SELECTOR_IMPLEMENTATIONS.some(
              implementation => implementation.definition === dependency.definition,
            )
              ? [dependency.definition]
              : [],
          ),
        ),
      ]);
      context.statisticsReducerRegistry = reducerDefinitions;
      context.rowSelectorRegistry = selectorDefinitions;

      let reducerIndex = 0;
      let selectorIndex = 0;
      const computation = {
        reduce: async (
          rows: Parameters<AnyStatisticsReducerImplementation['reduce']>[0],
          operation: IRDataReducerOperation,
        ) => {
          const dependency = reducerDependencies[reducerIndex++ % reducerDependencies.length];
          if (dependency.operation.kind !== operation.kind)
            throw new RetikzDataError('data: undeclared reducer dependency');

          const implementation = reducers.get(operation.kind);
          if (implementation === undefined) throw new RetikzDataError('data: missing prepared reducer');

          const result = await implementation.reduce(rows, dependency.operation as never, context);
          context.lineage?.recordReducerOperation({
            operation,
            rows,
            inputFields: dependency.definition.inputFields?.(dependency.operation as never) ?? [],
            outputFields: dependency.definition.outputs(dependency.operation as never).map(field => field.field),
          });

          return result;
        },
        select: async (
          rows: Parameters<AnyRowSelectorImplementation['select']>[0],
          operation: IRDataSelectorOperation,
        ) => {
          const dependency = selectorDependencies[selectorIndex++ % selectorDependencies.length];
          if (dependency.operation.kind !== operation.kind)
            throw new RetikzDataError('data: undeclared selector dependency');

          const implementation = selectors.get(operation.kind);
          if (implementation === undefined) throw new RetikzDataError('data: missing prepared selector');

          const result = await implementation.select(rows, dependency.operation as never);
          context.lineage?.recordSelectorOperation({
            operation,
            rows,
            selectedRows: result.map(selection => selection.row),
            inputFields: dependency.definition.inputFields?.(dependency.operation as never) ?? [],
          });

          return result;
        },
      };

      const dependency = stage.dependencies.find(candidate => candidate.type === 'regression');
      const regression = {
        fit: async (pairs: Parameters<AnyRegressionImplementation['fit']>[0]) => {
          if (dependency?.type !== 'regression') throw new RetikzDataError('data: undeclared regression dependency');

          const implementation = regressions.get(dependency.operation.kind);
          if (implementation === undefined) throw new RetikzDataError('data: missing prepared regression');

          const model = await implementation.fit(pairs, dependency.operation as never);

          return {
            predict: (x: number) => {
              const prediction = model.predict(x);
              if (!Number.isFinite(prediction))
                throw new RetikzDataError('data: regression produced a non-finite prediction');

              return prediction;
            },
          };
        },
        validateExtent: (extent: [number, number]) => {
          if (dependency?.type === 'regression')
            dependency.definition.validateExtent?.(dependency.operation as never, extent);
        },
      };

      const asyncTransforms = indexImplementations<AnyTransformImplementation>(
        createAsyncBuiltinTransformImplementations(computation, regression),
        options.transformImplementations ?? [],
        extractTransformKind,
      );
      const implementation = asyncTransforms.get(stage.operation.kind);
      if (implementation === undefined || implementation.definition !== stage.definition)
        throw new RetikzDataError(`data: "${stage.operation.kind}" has no matching local implementation`);

      return implementation;
    };
  };
};
