import type {
  AnyTransformDefinition,
  AnySynchronousTransformImplementation,
  AnySynchronousStatisticsReducerImplementation,
  AnySynchronousRowSelectorImplementation,
  AnySynchronousRegressionImplementation,
  DataLineageOptions,
  DataLineageRun,
  DataLineageRecorder,
  DataView,
  FieldCollector,
  TransformContext,
  TransformSemanticContext,
} from '../contract';
import { RetikzDataError } from '../error';
import {
  resolveTransformRegistry,
  resolveTransformImplementationRegistry,
  resolveStatisticsReducerImplementationRegistry,
  resolveRowSelectorImplementationRegistry,
  resolveRegressionImplementationRegistry,
} from '../providers';
import { createDataView, ingestDataTransformResult } from '../resolve';
import { parseDataTransformDeclarations, resolveParsedDataTransforms } from '../resolve/transform';
import type { ParsedDataTransformDeclaration } from '../resolve/transform';
import type { IRDataTransform } from '../schemas';
import type { ExternalRow } from '../shared';
import { createDataLineageRecorder } from './lineage';
import { readSourceIndex, readSourceIndices, tagSourceIndex, withGroupProvenance } from './provenance';

/** 内置来源 helper；计算与语义上下文独立 */
export const DEFAULT_TRANSFORM_CONTEXT: Readonly<TransformContext> = Object.freeze({
  readSourceIndex,
  readSourceIndices,
  groupProvenance: withGroupProvenance,
});

/** 同步便捷入口的明确计算能力，不能注册 Promise 回调 */
export type ApplyTransformsOptions = Readonly<{
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
  lineage?: DataLineageRecorder & DataLineageRun,
  parsedDeclarations?: ReadonlyArray<ParsedDataTransformDeclaration>,
): { dataView: DataView; lineage?: DataLineageRun } => {
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

  if (lineage !== undefined) context.lineage = lineage;
  let rows = lineage === undefined ? view.rows : tagSourceIndex(view.rows);
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
 * @param options 语义注册表与同步计算实现；省略时使用内置计算
 * @returns 计算后的完整数据视图
 * @throws {RetikzDataError} 语义解析、计算或结果校验失败
 */
export const applyTransformsToDataView = (
  view: DataView,
  operations: Array<IRDataTransform> = [],
  options: ApplyTransformsOptions = {},
): DataView => (operations.length === 0 ? view : applyToView(view, operations, options).dataView);

/**
 * 同步行数据便捷入口；全计划预检后只执行一次
 * @param rows 已规范化的输入行数组
 * @param operations 按顺序执行的变换操作；省略时为空列表
 * @param options 语义注册表与同步计算实现；省略时使用内置计算
 * @returns 计算后的行数组
 * @throws {RetikzDataError} 语义解析、计算或结果校验失败
 */
export const applyTransforms = (
  rows: Array<ExternalRow>,
  operations: Array<IRDataTransform> = [],
  options: ApplyTransformsOptions = {},
): Array<ExternalRow> => {
  if (operations.length === 0) return rows;

  const parsed = parseDataTransformDeclarations(
    operations.map(operation => ({ operation })),
    options.registry ?? resolveTransformRegistry(),
  );
  const fields = collectRowInputFields(parsed, options);

  return applyToView(describeRows(rows, fields), operations, options, undefined, parsed).dataView.rows;
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

/**
 * 从唯一语义模型投影派生字段，供宿主 strict 引用检查
 * @param transform 待分析的变换操作
 * @param fields 接收输入字段名的收集器
 * @param derivedOutputs 接收派生字段名的集合，会就地更新
 * @param registry 变换定义注册表；省略时使用内置定义
 * @param semantic 统计定义与可选输入模型；省略时使用空模型
 * @throws {RetikzDataError} 变换未注册、参数解析或字段语义回调失败
 */
export const collectTransformFields = (
  transform: IRDataTransform,
  fields: FieldCollector,
  derivedOutputs: Set<string>,
  registry: ReadonlyMap<string, AnyTransformDefinition> = resolveTransformRegistry(),
  semantic: Omit<TransformSemanticContext, 'model'> & Partial<Pick<TransformSemanticContext, 'model'>> = {},
): void => {
  const definition = registry.get(transform.kind);
  if (definition === undefined) throw new RetikzDataError(`data: transform "${transform.kind}" is not registered`);

  const operation = definition.schema.parse(transform) as never;
  const context = { ...semantic, model: semantic.model ?? [] };
  fields.addFields(...(definition.inputFields?.(operation, context) ?? []));
  const output = definition.outputModel(operation, context);

  for (const descriptor of output.kind === 'preserve' ? output.outputs : output.fields) {
    if (
      output.kind === 'preserve' ||
      descriptor.type === undefined ||
      typeof descriptor.type === 'string' ||
      descriptor.type.from !== descriptor.field
    )
      derivedOutputs.add(descriptor.field);
  }
};

/** 同步来源执行选项 */
export type ApplyTransformsWithLineageOptions = ApplyTransformsOptions &
  Readonly<{
    /** 控制变换事件记录的启用方式、预算与接收器 */
    lineage?: DataLineageOptions;
  }>;

/** 同步行执行的事件记录 */
export type ApplyTransformsWithLineageResult = Readonly<{
  /** 完成变换后的数据行 */
  rows: Array<ExternalRow>;
  /** 本次变换执行产生的事件记录 */
  lineage: DataLineageRun;
}>;

/** 同步完整视图与事件记录 */
export type ApplyTransformsToDataViewWithLineageResult = Readonly<{
  /** 完成变换后的数据视图 */
  dataView: DataView;
  /** 本次变换执行产生的事件记录 */
  lineage: DataLineageRun;
}>;

/**
 * 一次同步执行并返回实际来源事件
 * @param view 已规范化的输入数据视图
 * @param operations 按顺序执行的变换操作；省略时为空列表
 * @param options 语义注册表与同步计算实现；省略时使用内置计算
 * @returns 计算后的完整数据视图与执行事件
 * @throws {RetikzDataError} 语义解析、计算或结果校验失败
 */
export const applyTransformsToDataViewWithLineage = (
  view: DataView,
  operations: Array<IRDataTransform> = [],
  options: ApplyTransformsWithLineageOptions = {},
): ApplyTransformsToDataViewWithLineageResult => {
  const lineage = createDataLineageRecorder(options.lineage ?? {});
  const result = applyToView(view, operations, options, lineage);
  return { dataView: result.dataView, lineage };
};

/**
 * 行数据同步来源便捷入口
 * @param rows 已规范化的输入行数组
 * @param operations 按顺序执行的变换操作；省略时为空列表
 * @param options 语义注册表与同步计算实现；省略时使用内置计算
 * @returns 计算后的行数组与执行事件
 * @throws {RetikzDataError} 语义解析、计算或结果校验失败
 */
export const applyTransformsWithLineage = (
  rows: Array<ExternalRow>,
  operations: Array<IRDataTransform> = [],
  options: ApplyTransformsWithLineageOptions = {},
): ApplyTransformsWithLineageResult => {
  const parsed = parseDataTransformDeclarations(
    operations.map(operation => ({ operation })),
    options.registry ?? resolveTransformRegistry(),
  );
  const lineage = createDataLineageRecorder(options.lineage ?? {});
  const result = applyToView(
    describeRows(rows, collectRowInputFields(parsed, options)),
    operations,
    options,
    lineage,
    parsed,
  );

  return { rows: result.dataView.rows, lineage };
};
