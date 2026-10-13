import { RetikzDataError } from '../error';
import type { DataView } from '../model';
import { createDataView } from '../model';
import type { AnySynchronousStatisticsReducerImplementation } from '../operators/reducer';
import { resolveStatisticsReducerImplementationRegistry } from '../operators/reducer';
import type { AnySynchronousRegressionImplementation } from '../operators/regression';
import { resolveRegressionImplementationRegistry } from '../operators/regression';
import type { AnySynchronousRowSelectorImplementation } from '../operators/selector';
import { resolveRowSelectorImplementationRegistry } from '../operators/selector';
import type { DataLineageOptions, DataLineageRun } from '../provenance';
import {
  createDataLineageRecorder,
  readSourceIndex,
  readSourceIndices,
  resolveDataLineageOptions,
  tagSourceIndex,
  withGroupProvenance,
} from '../provenance';
import type { ExternalRow } from '../shared';
import type {
  AnySynchronousTransformImplementation,
  AnyTransformDefinition,
  IRDataTransform,
  ParsedDataTransformDeclaration,
  TransformContext,
  TransformSemanticContext,
} from '../transform';
import {
  parseDataTransformDeclarations,
  resolveParsedDataTransforms,
  resolveTransformImplementationRegistry,
  resolveTransformRegistry,
} from '../transform';
import { ingestDataTransformResult } from './result';

/** 内置来源 helper；计算与语义上下文独立 */
export const DEFAULT_TRANSFORM_CONTEXT: Readonly<TransformContext> = Object.freeze({
  readSourceIndex,
  readSourceIndices,
  groupProvenance: withGroupProvenance,
});

/** 同步便捷入口的明确计算能力，不能注册 Promise 回调 */
export type ApplyTransformsOptions = Readonly<{
  /**
   * 为尚无来源的输入建立零基索引，默认关闭；已有来源始终保留
   * @default false
   */
  provenance?: boolean;
  /**
   * true 使用默认事件配置，对象自定义配置；false 或省略时不记录，不隐式建立行来源
   * @default false
   */
  lineage?: boolean | DataLineageOptions;
  /** 本次唯一的语义 registry */
  registry?: ReadonlyMap<string, AnyTransformDefinition>;
  /** 显式同步 transform 实现 */
  transformImplementations?: ReadonlyArray<AnySynchronousTransformImplementation>;
  /** 显式同步统计实现 */
  statisticsReducerImplementations?: ReadonlyArray<AnySynchronousStatisticsReducerImplementation>;
  /** 显式同步选择实现 */
  rowSelectorImplementations?: ReadonlyArray<AnySynchronousRowSelectorImplementation>;
  /** 显式同步拟合实现 */
  regressionImplementations?: ReadonlyArray<AnySynchronousRegressionImplementation>;
  /** 来源、统计语义与当前计算上下文 */
  context?: Partial<TransformContext>;
}>;

/** 同步行变换结果；来源保存在行上，事件单独返回 */
export type ApplyTransformsResult = Readonly<{
  /** 完成变换后的数据行 */
  rows: Array<ExternalRow>;
  /** 显式启用事件记录时的本次运行 */
  lineage?: DataLineageRun;
}>;

/** 同步视图变换结果 */
export type ApplyTransformsToDataViewResult = Readonly<{
  /** 完成变换后的完整视图 */
  dataView: DataView;
  /** 显式启用事件记录时的本次运行 */
  lineage?: DataLineageRun;
}>;

/** 无 metadata 的同步行输入只从实际规范 scalar 获取证据 */
const describeRows = (rows: Array<ExternalRow>, fields: ReadonlyArray<string> = []): DataView =>
  createDataView(
    rows,
    [...new Set([...fields, ...rows.flatMap(row => Object.keys(row))])].map(name => ({ name })),
  );

/** 明确建立同步计算集合；不调用回调探测 Promise */
const createSyncContext = (
  registry: ReadonlyMap<string, AnyTransformDefinition>,
  options: ApplyTransformsOptions,
): TransformContext => {
  const context = { ...DEFAULT_TRANSFORM_CONTEXT, ...options.context };
  return {
    ...context,
    transformImplementationRegistry:
      context.transformImplementationRegistry ??
      resolveTransformImplementationRegistry(registry, options.transformImplementations),
    statisticsReducerImplementationRegistry:
      context.statisticsReducerImplementationRegistry ??
      resolveStatisticsReducerImplementationRegistry(
        context.statisticsReducerRegistry,
        options.statisticsReducerImplementations,
      ),
    rowSelectorImplementationRegistry:
      context.rowSelectorImplementationRegistry ??
      resolveRowSelectorImplementationRegistry(context.rowSelectorRegistry, options.rowSelectorImplementations),
    regressionImplementationRegistry:
      context.regressionImplementationRegistry ??
      resolveRegressionImplementationRegistry(context.regressionRegistry, options.regressionImplementations),
  };
};

/** 在首个计算前确认全部语义和本地实现，随后一次折叠执行 */
const applyToView = (
  view: DataView,
  operations: Array<IRDataTransform>,
  options: ApplyTransformsOptions,
  parsedDeclarations?: ReadonlyArray<ParsedDataTransformDeclaration>,
): ApplyTransformsToDataViewResult => {
  const registry = options.registry ?? resolveTransformRegistry();
  const context = createSyncContext(registry, options);
  const inputModel = view.model;
  const resolution = resolveParsedDataTransforms(
    parsedDeclarations ??
      parseDataTransformDeclarations(
        operations.map(operation => ({ operation })),
        registry,
      ),
    inputModel,
    { ...context, transformRegistry: registry },
  );

  const implementations = resolution.stages.map(stage => {
    const implementation = context.transformImplementationRegistry?.get(stage.operation.kind);
    if (implementation === undefined || implementation.definition !== stage.definition)
      throw new RetikzDataError(`data: "${stage.operation.kind}" has no matching synchronous implementation`);

    for (const dependency of stage.dependencies) {
      const matched =
        dependency.type === 'reducer'
          ? context.statisticsReducerImplementationRegistry?.get(dependency.operation.kind)
          : dependency.type === 'selector'
            ? context.rowSelectorImplementationRegistry?.get(dependency.operation.kind)
            : context.regressionImplementationRegistry?.get(dependency.operation.kind);
      if (matched === undefined || matched.definition !== dependency.definition)
        throw new RetikzDataError(
          `data: ${dependency.type} "${dependency.operation.kind}" has no matching synchronous implementation`,
        );
    }

    return implementation;
  });

  const lineageOptions = resolveDataLineageOptions(options.lineage);
  const lineage = lineageOptions === undefined ? undefined : createDataLineageRecorder(lineageOptions);
  context.lineage = lineage;
  let rows = options.provenance === true ? tagSourceIndex(view.rows) : view.rows;
  lineage?.recordSource(rows);

  for (const [operationIndex, stage] of resolution.stages.entries()) {
    const previous = rows;

    try {
      rows = implementations[operationIndex].apply(rows, stage.operation as never, context);
    } catch (cause) {
      throw new RetikzDataError(
        `data: transform at index ${operationIndex} failed${cause instanceof RetikzDataError ? `: ${cause.message}` : ''}`,
        { cause, operationIndex },
      );
    }

    const model = stage.outputModel;
    ingestDataTransformResult({ inputModel: model, stages: [] }, { rows, model });
    const semantic: TransformSemanticContext = {
      ...context,
      model: operationIndex === 0 ? inputModel : resolution.stages[operationIndex - 1].outputModel,
    };
    const output = stage.definition.outputModel(stage.operation as never, semantic);
    lineage?.recordTransformStep({
      operationIndex,
      operation: stage.operation,
      inputRows: previous,
      outputRows: rows,
      inputFields: stage.definition.inputFields?.(stage.operation as never, semantic) ?? [],
      outputFields: (output.kind === 'preserve' ? output.outputs : output.fields)
        .filter(
          field =>
            output.kind === 'preserve' ||
            field.type === undefined ||
            typeof field.type === 'string' ||
            field.type.from !== field.field,
        )
        .map(field => field.field),
    });
  }

  const dataView = ingestDataTransformResult(resolution, {
    rows,
    model: resolution.stages.at(-1)?.outputModel ?? inputModel,
  });

  return { dataView, ...(lineage === undefined ? {} : { lineage }) };
};

/**
 * 按声明顺序同步推进规范 DataView
 * @param view 已规范化的输入数据视图
 * @param operations 按顺序执行的变换操作；省略时为空列表
 * @param options 语义注册表、同步计算实现与可选来源/事件记录
 * @returns 完整数据视图及可选执行事件
 * @throws {RetikzDataError} 语义解析、计算或结果校验失败
 */
export const applyTransformsToDataView = (
  view: DataView,
  operations: Array<IRDataTransform> = [],
  options: ApplyTransformsOptions = {},
): ApplyTransformsToDataViewResult =>
  operations.length === 0 && options.provenance !== true && !options.lineage
    ? { dataView: view }
    : applyToView(view, operations, options);

/**
 * 同步行数据便捷入口；全计划预检后只执行一次
 * @param rows 已规范化的输入行数组
 * @param operations 按顺序执行的变换操作；省略时为空列表
 * @param options 语义注册表、同步计算实现与可选来源/事件记录
 * @returns 行数组及可选执行事件
 * @throws {RetikzDataError} 语义解析、计算或结果校验失败
 */
export const applyTransforms = (
  rows: Array<ExternalRow>,
  operations: Array<IRDataTransform> = [],
  options: ApplyTransformsOptions = {},
): ApplyTransformsResult => {
  if (operations.length === 0 && options.provenance !== true && !options.lineage) return { rows };

  const parsed = parseDataTransformDeclarations(
    operations.map(operation => ({ operation })),
    options.registry ?? resolveTransformRegistry(),
  );
  const fields = collectRowInputFields(parsed, options);

  const result = applyToView(describeRows(rows, fields), operations, options, parsed);
  return { rows: result.dataView.rows, ...(result.lineage === undefined ? {} : { lineage: result.lineage }) };
};

/** 裸行调用以显式字段引用提供未知类型的模型槽位 */
const collectRowInputFields = (
  declarations: ReadonlyArray<ParsedDataTransformDeclaration>,
  options: ApplyTransformsOptions,
): Array<string> => {
  const context: TransformSemanticContext = { ...options.context, model: [] };
  const fields = new Set<string>();

  for (const { declaration, definition } of declarations) {
    for (const field of definition.inputFields?.(declaration.operation as never, context) ?? []) fields.add(field);
  }

  return [...fields];
};
