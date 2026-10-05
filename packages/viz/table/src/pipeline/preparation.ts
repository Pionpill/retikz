import type { DataTransformResult, DataTransformStageInput, ExternalDatasets, ExternalRow } from '@retikz/data';
import {
  applyTransformsToDataView,
  assertDataTransformModel,
  assertDataTransformResult,
  collectFormatFields,
  collectTransformFields,
  createDataTransformExecutor,
  createDataView,
  DEFAULT_TRANSFORM_CONTEXT,
  describeDataTransformInput,
  normalizeRows,
  resolveDataExecution,
  resolveDataTransforms,
  resolveFieldTypes,
  resolveFieldPath,
  resolveFormatRegistry,
  resolveTransformRegistry,
  resolveTransformImplementationRegistry,
  resolveStatisticsReducerRegistry,
  resolveStatisticsReducerImplementationRegistry,
  resolveRowSelectorRegistry,
  resolveRowSelectorImplementationRegistry,
  resolveRegressionRegistry,
  resolveRegressionImplementationRegistry,
  SOURCE_INDEX,
  SOURCE_INDICES,
} from '@retikz/data';

import type { TableDataOptions, TableDataPreparation, TableDataPreparationOptions } from '../contract';
import { RetikzTableError } from '../error';
import type { IRDetailTable, IRTable } from '../schemas';

/** 所有Table数据入口复用相同Data语义与本地实现 */
const tableDataRegistries = (options: TableDataOptions) => {
  const transformRegistry = resolveTransformRegistry(options.transformDefinitions);
  const context = {
    ...DEFAULT_TRANSFORM_CONTEXT,
    statisticsReducerRegistry: resolveStatisticsReducerRegistry(options.statisticsReducerDefinitions),
    rowSelectorRegistry: resolveRowSelectorRegistry(options.rowSelectorDefinitions),
    regressionRegistry: resolveRegressionRegistry(options.regressionDefinitions),
  };

  return { transformRegistry, context };
};

/** 仅原始rows进入源格式解析，完整模型随后成为消费事实源 */
const tableRowsResult = (spec: IRTable, rows: Array<ExternalRow>, options: TableDataOptions): DataTransformResult => {
  const fields = new Set(spec.data?.model?.map(field => field.name) ?? rows.flatMap(row => Object.keys(row)));
  const registries = tableDataRegistries(options);
  const required = new Set<string>();
  const derived = new Set<string>();

  const addField = (field: string | undefined): void => {
    if (field !== undefined) required.add(field);
  };

  for (const declaration of spec.transform ?? [])
    collectTransformFields(
      declaration.operation,
      { addField, addFields: (...names) => names.forEach(addField) },
      derived,
      registries.transformRegistry,
      { ...registries.context, model: spec.data?.model },
    );

  if (spec.structure.kind === 'detail')
    for (const column of (spec as IRDetailTable).structure.columns) required.add(column.field);
  if (spec.data?.model === undefined) for (const field of required) if (!derived.has(field)) fields.add(field);
  const types = resolveFieldTypes(spec.data?.model, rows, fields);
  const formats =
    spec.transform === undefined
      ? { fieldTypeMap: types, parsers: undefined }
      : collectFormatFields(spec.data?.model, types, fields, resolveFormatRegistry(options.formatDefinitions));
  const normalized =
    spec.transform === undefined ? rows : normalizeRows(rows, formats.fieldTypeMap, undefined, formats.parsers);
  const view = createDataView(
    normalized,
    [...fields].map(name => {
      const declared = spec.data?.model?.find(field => field.name === name);
      const type =
        declared?.type ??
        ((declared?.format !== undefined && spec.transform !== undefined) ||
        rows.some(row => resolveFieldPath(row, name) != null)
          ? formats.fieldTypeMap.get(name)
          : undefined);

      return {
        name,
        ...(type === undefined ? {} : { type }),
        ...(declared?.order === undefined ? {} : { order: declared.order }),
      };
    }),
  );

  return { rows: view.rows, model: view.model };
};

/** 没有绑定的Custom不能声明数据变换，Manual通过schema禁止数据声明 */
const assertTableDataScope = (spec: IRTable): void => {
  if (spec.data === undefined && (spec.transform !== undefined || spec.dataExecution !== undefined))
    throw new RetikzTableError('Table transform/dataExecution requires a bound dataset');
};

/** 同步Table仅运行明确内置策略，所有外部需求在任何计算前失败 */
const resolveTableDataImpl = (
  spec: IRTable,
  datasets: ExternalDatasets,
  options: TableDataOptions = {},
): DataTransformResult | undefined => {
  assertTableDataScope(spec);
  if (spec.data === undefined || spec.transform === undefined) return undefined;

  for (const declaration of spec.transform) {
    if (resolveDataExecution(undefined, spec.dataExecution, declaration.dataExecution).mode !== 'builtin')
      throw new RetikzTableError('Table external/hybrid transforms require async processing');
  }

  if (!Object.hasOwn(datasets, spec.data.reference))
    throw new RetikzTableError(`Table dataset "${spec.data.reference}" not found`);

  const result = tableRowsResult(spec, datasets[spec.data.reference], options);
  const { transformRegistry, context } = tableDataRegistries(options);
  const completeContext = {
    ...context,
    transformImplementationRegistry: resolveTransformImplementationRegistry(
      transformRegistry,
      options.transformImplementations,
    ),
    statisticsReducerImplementationRegistry: resolveStatisticsReducerImplementationRegistry(
      context.statisticsReducerRegistry,
      options.statisticsReducerImplementations,
    ),
    rowSelectorImplementationRegistry: resolveRowSelectorImplementationRegistry(
      context.rowSelectorRegistry,
      options.rowSelectorImplementations,
    ),
    regressionImplementationRegistry: resolveRegressionImplementationRegistry(
      context.regressionRegistry,
      options.regressionImplementations,
    ),
  };
  const view = applyTransformsToDataView(
    createDataView(result.rows, result.model),
    spec.transform.map(declaration => declaration.operation),
    { registry: transformRegistry, context: completeContext },
  );

  return { rows: view.rows, model: view.model };
};

/** 先预检全部阶段，执行后把实际结果交给同步Table结构与布局 */
const prepareTableDataImpl = async <TSource = never>(
  spec: IRTable,
  request: TableDataPreparationOptions<TSource>,
  options: TableDataOptions = {},
): Promise<TableDataPreparation> => {
  assertTableDataScope(spec);
  let consumed = false;

  const once = (): void => {
    if (consumed) throw new RetikzTableError('Table data preparation can execute only once');
    consumed = true;
  };

  if (spec.data === undefined)
    return {
      execute: () => {
        once();
        return Promise.resolve(undefined);
      },
    };

  const reference = spec.data.reference;
  if (!Object.hasOwn(request.dataBindings, reference))
    throw new RetikzTableError(`Table data binding "${reference}" not found`);

  const binding = request.dataBindings[reference];
  let input: DataTransformStageInput<TSource>;
  if (binding.kind === 'rows') input = { kind: 'result', result: tableRowsResult(spec, binding.rows, options) };
  else {
    if (spec.data.model?.some(field => field.format !== undefined))
      throw new RetikzTableError('Table canonical result/source cannot use source formats');
    if (binding.kind === 'source') {
      if (spec.data.model === undefined)
        throw new RetikzTableError('Table native source requires an explicit complete data.model');
      input = { kind: 'source', source: binding.source, model: spec.data.model };
    } else {
      if (spec.data.model !== undefined) assertDataTransformModel(spec.data.model, binding.result.model);
      assertDataTransformResult(binding.result.model, binding.result);
      const rows = binding.result.rows.map(row => {
        const copy = { ...row };
        Reflect.deleteProperty(copy, SOURCE_INDEX);
        Reflect.deleteProperty(copy, SOURCE_INDICES);

        return copy;
      });
      input = { kind: 'result', result: { ...binding.result, rows } };
    }
  }

  if (binding.kind === 'rows' && spec.transform === undefined && input.kind === 'result') {
    const result = input.result;
    return {
      execute: () => {
        once();
        return Promise.resolve(result);
      },
    };
  }

  const { transformRegistry, context } = tableDataRegistries(options);
  const descriptor = describeDataTransformInput(input);
  const resolution = resolveDataTransforms(spec.transform ?? [], descriptor.model, { transformRegistry, ...context });
  const executor = request.dataTransformExecutor ?? createDataTransformExecutor<TSource>(options);
  const preparation = await executor.prepare(descriptor, resolution, {
    dataExecution: spec.dataExecution,
    signal: request.signal,
    lineage: request.lineage,
  });
  if (preparation.kind === 'unsupported')
    throw new RetikzTableError(
      `Table data preparation: ${preparation.diagnostics.map(diagnostic => diagnostic.message).join('; ')}`,
    );

  return {
    execute: async () => {
      once();
      return preparation.bind(input).execute();
    },
  };
};

/** 保留Data/外部异常作为cause，并附Table数据作用域 */
const tableDataError = (spec: IRTable, cause: unknown): RetikzTableError =>
  cause instanceof RetikzTableError
    ? cause
    : new RetikzTableError(
        `Table data "${spec.data?.reference ?? spec.id ?? 'unbound'}": ${cause instanceof Error ? cause.message : String(cause)}`,
        { cause },
      );

/** 同步数据边界：规范结果在结构解析前就绪 */
export const resolveTableData = (
  spec: IRTable,
  datasets: ExternalDatasets,
  options: TableDataOptions = {},
): DataTransformResult | undefined => {
  try {
    return resolveTableDataImpl(spec, datasets, options);
  } catch (cause) {
    throw tableDataError(spec, cause);
  }
};

/** 全阶段预检完成后提供单次执行，失败保留原始cause */
export const prepareTableData = async <TSource = never>(
  spec: IRTable,
  request: TableDataPreparationOptions<TSource>,
  options: TableDataOptions = {},
): Promise<TableDataPreparation> => {
  try {
    const preparation = await prepareTableDataImpl(spec, request, options);
    return {
      execute: async () => {
        try {
          return await preparation.execute();
        } catch (cause) {
          throw tableDataError(spec, cause);
        }
      },
    };
  } catch (cause) {
    throw tableDataError(spec, cause);
  }
};
