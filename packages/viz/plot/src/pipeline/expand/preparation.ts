import type {
  DataFieldTypeMap,
  DataTransformPreparation,
  DataTransformResult,
  DataTransformStageInput,
  IRDataTransformDeclaration,
  IRDataExecution,
} from '@retikz/data';
import {
  assertAllValuesValid,
  assertFieldOrders,
  assertDataTransformModel,
  assertDataTransformResult,
  createDataTransformExecutor,
  createDataView,
  describeDataTransformInput,
  readSourceIndex,
  readSourceIndices,
  resolveDataTransforms,
  SOURCE_INDEX,
  SOURCE_INDICES,
  tagSourceIndex,
  validateBoundData,
} from '@retikz/data';

import type { PlotDataPreparation, PlotDataPreparationOptions, PreparedPlotData } from '../../contract';
import { RetikzPlotError } from '../../error';
import { isSingleMark } from '../../resolve';
import { resolvePlotDataExecution } from '../../resolve';
import { resolveComposition, resolveFacetPanels } from '../../resolve/composition';
import type { IRPlot, IRPlotMark } from '../../schemas';
import { preparePlotRegistries, prepareRows } from './data';
import type { LowerPlotsOptions } from './types';

/** 读取内置图元的局部 Data 变换声明 */
export const plotMarkTransformsOf = (mark: IRPlotMark): Array<IRDataTransformDeclaration> => mark.transforms ?? [];

/**
 * 全部作用域先固定实现，再绑定本次根与实际分区进行单次计算
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export const preparePlotData = async <TSource = never>(
  spec: IRPlot,
  request: PlotDataPreparationOptions<TSource>,
  options: LowerPlotsOptions = {},
): Promise<PlotDataPreparation> => {
  const reference = spec.data.reference;
  if (!Object.hasOwn(request.dataBindings, reference))
    throw new RetikzPlotError(`Plot data binding "${reference}" not found`);

  const binding = request.dataBindings[reference];
  const provenance =
    options.provenance === true || options.datumProvenance === true || options.datumIdField !== undefined;
  const registries = preparePlotRegistries(options);
  assertFieldOrders(spec.data.model, registries.fieldOrderRegistry);
  let input: DataTransformStageInput<TSource>;
  if (binding.kind === 'rows') {
    const rows = provenance ? tagSourceIndex(binding.rows) : binding.rows;
    const prepared = prepareRows(spec, { [reference]: rows }, options, rows, registries);
    if (options.invalid === 'error') assertAllValuesValid(prepared.normalized, prepared.fieldTypeMap);
    if (options.validateData)
      validateBoundData(
        prepared.normalized,
        prepared.fieldTypeMap,
        typeof options.validateData === 'object' ? (options.validateData.sampleRows ?? 100) : 100,
      );

    input = { kind: 'result', result: { rows: prepared.dataView.rows, model: prepared.dataView.model } };
  } else {
    if (
      spec.data.model?.some(field => field.format !== undefined) ||
      options.datasetFieldMaps !== undefined ||
      options.resolveField !== undefined
    )
      throw new RetikzPlotError(
        'Plot canonical result/source bindings cannot use source format, datasetFieldMaps or parsers',
      );

    if (binding.kind === 'source') {
      if (spec.data.model === undefined)
        throw new RetikzPlotError('Plot native source requires an explicit complete data.model');
      input = { kind: 'source', source: binding.source, model: spec.data.model };
    } else {
      if (spec.data.model !== undefined) assertDataTransformModel(spec.data.model, binding.result.model);
      assertDataTransformResult(binding.result.model, binding.result);

      // 新结果引用的局部来源只能指向该结果，不能沿用上游的 Symbol 下标
      const rows = binding.result.rows.map(row => {
        const copy = { ...row };
        Reflect.deleteProperty(copy, SOURCE_INDEX);
        Reflect.deleteProperty(copy, SOURCE_INDICES);

        return copy;
      });
      const view = createDataView(provenance ? tagSourceIndex(rows) : rows, binding.result.model);
      if (options.invalid === 'error' || options.validateData) {
        const fieldTypeMap: DataFieldTypeMap = new Map();

        for (const field of view.model) {
          if (field.type !== undefined) fieldTypeMap.set(field.name, field.type);
        }

        if (options.invalid === 'error') assertAllValuesValid(view.rows, fieldTypeMap);
        if (options.validateData)
          validateBoundData(
            view.rows,
            fieldTypeMap,
            typeof options.validateData === 'object' ? (options.validateData.sampleRows ?? 100) : 100,
          );
      }

      input = { kind: 'result', result: { ...binding.result, rows: view.rows, model: view.model } };
    }
  }

  const preserveProvenance =
    provenance ||
    (input.kind === 'result' &&
      input.result.rows.some(row => readSourceIndex(row) !== undefined || readSourceIndices(row) !== undefined));
  const executor =
    request.dataTransformExecutor ??
    createDataTransformExecutor<TSource>({
      transformImplementations: options.implementations?.transforms,
      statisticsReducerImplementations: options.implementations?.statisticsReducers,
      rowSelectorImplementations: options.implementations?.rowSelectors,
      regressionImplementations: options.implementations?.regressions,
    });
  const semantic = { transformRegistry: registries.transformRegistry, ...registries.transformContext };
  const descriptor = describeDataTransformInput(input);
  assertFieldOrders(descriptor.model, registries.fieldOrderRegistry);
  const rootResolution = resolveDataTransforms(spec.transform ?? [], descriptor.model, semantic);
  const model = rootResolution.stages.at(-1)?.outputModel ?? rootResolution.inputModel;
  const markResolutions = spec.marks.map(mark =>
    isSingleMark(mark, { registry: registries.markRegistry })
      ? undefined
      : resolveDataTransforms(plotMarkTransformsOf(mark), model, semantic),
  );

  const prepareScope = async (
    scope: string,
    scopeDescriptor: typeof descriptor,
    resolution: typeof rootResolution,
    dataExecution: IRDataExecution | undefined,
  ) => {
    for (const stage of resolution.stages) assertFieldOrders(stage.outputModel, registries.fieldOrderRegistry);
    try {
      const prepared = await executor.prepare(scopeDescriptor, resolution, {
        dataExecution,
        provenance: preserveProvenance,
        lineage: request.lineage,
        signal: request.signal,
      });
      if (prepared.kind === 'unsupported')
        throw new RetikzPlotError(
          `Plot ${scope}: ${prepared.diagnostics.map(diagnostic => diagnostic.message).join('; ')}`,
        );

      return prepared;
    } catch (cause) {
      throw new RetikzPlotError(
        `Plot ${scope} preparation failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        { cause },
      );
    }
  };

  const root = await prepareScope(
    'root',
    descriptor,
    rootResolution,
    resolvePlotDataExecution(spec.dataExecution, 'root'),
  );
  const marks: Array<Extract<DataTransformPreparation<TSource>, { kind: 'ready' }> | undefined> = [];

  for (const [index, resolution] of markResolutions.entries())
    marks.push(
      resolution === undefined
        ? undefined
        : await prepareScope(
            `mark[${index}]`,
            { kind: 'result', model },
            resolution,
            resolvePlotDataExecution(spec.dataExecution, 'marks'),
          ),
    );
  const composition = resolveComposition(spec);
  let consumed = false;

  return {
    execute: async (): Promise<PreparedPlotData> => {
      if (consumed) throw new RetikzPlotError('Plot data preparation can execute only once');

      consumed = true;

      const run = async (
        scope: string,
        prepared: Extract<DataTransformPreparation<TSource>, { kind: 'ready' }>,
        actual: DataTransformStageInput<TSource>,
      ) => {
        try {
          const result = await prepared.bind(actual).execute();
          assertFieldOrders(result.model, registries.fieldOrderRegistry);
          return result;
        } catch (cause) {
          throw new RetikzPlotError(`Plot ${scope} execution failed`, { cause });
        }
      };

      const rootResult = await run('root', root, input);
      const markResults: Array<DataTransformResult | undefined> = [];

      for (const [index, prepared] of marks.entries())
        markResults.push(
          prepared === undefined
            ? undefined
            : await run(`mark[${index}]`, prepared, {
                kind: 'result',
                result: { rows: rootResult.rows, model: rootResult.model },
              }),
        );

      const scopeIds = new Set(composition.coordinateScopes.scopes.map(scope => scope.id));
      const panels = composition.facets.flatMap(facet => resolveFacetPanels(facet, rootResult.rows, scopeIds));
      const panelResults: Array<Array<DataTransformResult | undefined>> = [];

      for (const [panelIndex, panel] of panels.entries()) {
        const results: Array<DataTransformResult | undefined> = [];

        for (const [markIndex, prepared] of marks.entries())
          results.push(
            prepared === undefined
              ? undefined
              : await run(`facet[${panelIndex}].mark[${markIndex}]`, prepared, {
                  kind: 'result',
                  result: { rows: panel.rows, model: rootResult.model },
                }),
          );

        panelResults.push(results);
      }

      return { root: rootResult, marks: markResults, panels: panelResults };
    },
  };
};
