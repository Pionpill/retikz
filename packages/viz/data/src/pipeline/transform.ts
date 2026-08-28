import { JsonObjectSchema } from '@retikz/core';

import type {
  AnyTransformDefinition,
  DataLineageOptions,
  DataLineageRun,
  DataTransformOutputDescriptor,
  DataTransformOutputModel,
  DataView,
  FieldCollector,
  TransformContext,
} from '../contract';
import type { DataFieldTypeValue, IRDataTransform } from '../schemas';
import type { ExternalRow } from '../shared';

import { RetikzDataError } from '../error';
import { resolveTransformRegistry } from '../providers';
import { createDataLineageRecorder } from './lineage';
import { readSourceIndex, readSourceIndices, tagSourceIndex, withGroupProvenance } from './provenance';

/** 默认 transform 上下文：使用 data provenance symbol 标记，不把来源信息写进 JSON IR */
export const DEFAULT_TRANSFORM_CONTEXT: Readonly<TransformContext> = Object.freeze({
  readSourceIndex,
  readSourceIndices,
  groupProvenance: withGroupProvenance,
});

/** 解析并校验单个 transform operation；返回可安全传给对应 definition 的宽类型 */
const parseTransformOperation = (definition: AnyTransformDefinition, operation: IRDataTransform): never => {
  JsonObjectSchema.parse(operation);
  const parsed = definition.schema.parse(operation) as never;
  JsonObjectSchema.parse(parsed);
  return parsed;
};

/** 查找 transform definition；未知 kind 必须 fail-loud，避免静默跳过结构性数据变换 */
const transformDefinitionOf = (
  operation: IRDataTransform,
  registry: ReadonlyMap<string, AnyTransformDefinition>,
): AnyTransformDefinition => {
  const definition = registry.get(operation.kind);
  if (definition === undefined) {
    throw new RetikzDataError(
      `applyTransforms: transform kind "${operation.kind}" is not registered; pass a TransformDefinition via options.transformDefinitions`,
    );
  }
  return definition;
};

/** 从当前DataView解析一个output descriptor的最终字段类型与证据 */
const resolveOutputDescriptor = (
  descriptor: DataTransformOutputDescriptor,
  current: DataView,
): Readonly<{ type: DataFieldTypeValue; evidenced: boolean }> => {
  if (typeof descriptor.type === 'string') return { type: descriptor.type, evidenced: true };
  const type = current.fieldTypes.get(descriptor.type.from);
  if (type === undefined) {
    throw new RetikzDataError(`data: transform output descriptor references unknown field "${descriptor.type.from}"`);
  }
  return { type, evidenced: current.fieldTypeEvidence.has(descriptor.type.from) };
};

/** 在operation执行前解析下一阶段字段类型图，避免失败后留下部分运行结果 */
const resolveOutputState = (
  current: DataView,
  model: DataTransformOutputModel | undefined,
): Pick<DataView, 'fieldTypes' | 'fieldTypeEvidence'> => {
  if (model === undefined) return { fieldTypes: new Map(), fieldTypeEvidence: new Set() };
  const fieldTypes = model.kind === 'preserve' ? new Map(current.fieldTypes) : new Map();
  const fieldTypeEvidence = model.kind === 'preserve' ? new Set(current.fieldTypeEvidence) : new Set<string>();
  const descriptors = model.kind === 'preserve' ? model.outputs : model.fields;
  const seen = new Set<string>();
  for (const descriptor of descriptors) {
    if (seen.has(descriptor.field)) {
      throw new RetikzDataError(`data: duplicate transform output descriptor field "${descriptor.field}"`);
    }
    seen.add(descriptor.field);
    const resolved = resolveOutputDescriptor(descriptor, current);
    fieldTypes.set(descriptor.field, resolved.type);
    if (resolved.evidenced) fieldTypeEvidence.add(descriptor.field);
    else fieldTypeEvidence.delete(descriptor.field);
  }
  return { fieldTypes, fieldTypeEvidence };
};

/** 从output model投影lineage与strict model使用的派生字段，不重复维护第二份字段清单 */
const outputFieldsOfModel = (model: DataTransformOutputModel | undefined): Array<string> | undefined => {
  if (model === undefined) return undefined;
  if (model.kind === 'preserve') return model.outputs.map(output => output.field);
  return model.fields
    .filter(field => typeof field.type === 'string' || field.type.from !== field.field)
    .map(field => field.field);
};

/** output model存在时由其投影派生字段，否则回退到无类型outputFields声明 */
const transformOutputFields = (
  definition: AnyTransformDefinition,
  operation: never,
  context: TransformContext,
): Array<string> =>
  outputFieldsOfModel(definition.outputModel?.(operation, context)) ??
  definition.outputFields?.(operation, context) ??
  [];

/** 执行单个transform并同步推进DataView与Definition消费态 */
const applyTransformToDataView = (
  current: DataView,
  operation: IRDataTransform,
  registry: ReadonlyMap<string, AnyTransformDefinition>,
  context: TransformContext,
) => {
  const definition = transformDefinitionOf(operation, registry);
  const parsed = parseTransformOperation(definition, operation);
  const outputState = resolveOutputState(current, definition.outputModel?.(parsed, context));
  return {
    definition,
    parsed,
    dataView: {
      rows: definition.apply(current.rows, parsed, context),
      ...outputState,
    } satisfies DataView,
  };
};

/**
 * 按声明顺序折叠transform并同步推进rows、字段类型与类型证据
 * @description 每一步先解析definition schema与output model，再执行operation；缺少output model时清空旧类型证据
 */
export const applyTransformsToDataView = (
  view: DataView,
  operations?: Array<IRDataTransform>,
  registry: ReadonlyMap<string, AnyTransformDefinition> = resolveTransformRegistry(),
  context: TransformContext = DEFAULT_TRANSFORM_CONTEXT,
): DataView => {
  if (operations === undefined || operations.length === 0) return view;
  return operations.reduce<DataView>(
    (current, operation) => applyTransformToDataView(current, operation, registry, context).dataView,
    view,
  );
};

/** 收集 transform 读取的源字段，并登记 transform 派生输出字段以供 strict model 排除 */
export const collectTransformFields = (
  transform: IRDataTransform,
  fields: FieldCollector,
  derivedOutputs: Set<string>,
  registry: ReadonlyMap<string, AnyTransformDefinition> = resolveTransformRegistry(),
  context: TransformContext = DEFAULT_TRANSFORM_CONTEXT,
): void => {
  const definition = transformDefinitionOf(transform, registry);
  const parsed = parseTransformOperation(definition, transform);
  fields.addFields(...(definition.inputFields?.(parsed, context) ?? []));
  for (const output of transformOutputFields(definition, parsed, context)) derivedOutputs.add(output);
};

/**
 * 按声明顺序折叠应用 transform。
 * @description data 内置 transform 包含 sort / summarize / select / annotate；宿主可通过 registry 注入更多 transform
 */
export const applyTransforms = (
  rows: Array<ExternalRow>,
  operations?: Array<IRDataTransform>,
  registry: ReadonlyMap<string, AnyTransformDefinition> = resolveTransformRegistry(),
  context: TransformContext = DEFAULT_TRANSFORM_CONTEXT,
): Array<ExternalRow> => {
  if (!operations || operations.length === 0) return rows;
  return operations.reduce((acc, operation) => {
    const definition = transformDefinitionOf(operation, registry);
    return definition.apply(acc, parseTransformOperation(definition, operation), context);
  }, rows);
};

/** applyTransformsWithLineage 的运行时选项 */
export type ApplyTransformsWithLineageOptions = {
  /** transform registry；缺省时使用 data 内置 registry */
  registry?: ReadonlyMap<string, AnyTransformDefinition>;
  /** transform context 增量；缺省 helper 会自动补齐 */
  context?: Partial<TransformContext>;
  /** lineage 开关；缺省等价于 `{}`，只记录轻量 source / step */
  lineage?: DataLineageOptions;
};

/** applyTransformsWithLineage 的运行结果 */
export type ApplyTransformsWithLineageResult = {
  /** transform 后的数据行 */
  rows: Array<ExternalRow>;
  /** 本次 transform 运行的 lineage 事件 */
  lineage: DataLineageRun;
};

/** applyTransformsToDataViewWithLineage 的运行结果 */
export type ApplyTransformsToDataViewWithLineageResult = {
  /** transform后的完整DataView */
  dataView: DataView;
  /** 本次transform运行的lineage事件 */
  lineage: DataLineageRun;
};

/**
 * 按声明顺序执行transform，并同步返回DataView与运行时lineage
 * @description 每个operation只执行一次，lineage输出字段与Definition output model使用同一解析结果
 */
export const applyTransformsToDataViewWithLineage = (
  view: DataView,
  operations?: Array<IRDataTransform>,
  options: ApplyTransformsWithLineageOptions = {},
): ApplyTransformsToDataViewWithLineageResult => {
  const lineage = createDataLineageRecorder(options.lineage ?? {});
  const context: TransformContext = {
    ...DEFAULT_TRANSFORM_CONTEXT,
    ...options.context,
    lineage,
  };
  const registry = options.registry ?? resolveTransformRegistry();
  const inputDataView: DataView = { ...view, rows: tagSourceIndex(view.rows) };
  lineage.recordSource(inputDataView.rows);

  if (operations === undefined || operations.length === 0) return { dataView: inputDataView, lineage };

  const dataView = operations.reduce<DataView>((current, operation, operationIndex) => {
    const step = applyTransformToDataView(current, operation, registry, context);
    const inputFields = step.definition.inputFields?.(step.parsed, context) ?? [];
    const outputFields = transformOutputFields(step.definition, step.parsed, context);
    lineage.recordTransformStep({
      operationIndex,
      operation,
      inputRows: current.rows,
      outputRows: step.dataView.rows,
      inputFields,
      outputFields,
    });
    return step.dataView;
  }, inputDataView);

  return { dataView, lineage };
};

/**
 * 按声明顺序执行 transform，并返回运行时 lineage。
 * @description 该入口不改变 IRDataTransform schema；lineage 只通过返回值暴露，不写入 JSON IR
 */
export const applyTransformsWithLineage = (
  rows: Array<ExternalRow>,
  operations?: Array<IRDataTransform>,
  options: ApplyTransformsWithLineageOptions = {},
): ApplyTransformsWithLineageResult => {
  const lineage = createDataLineageRecorder(options.lineage ?? {});
  const context: TransformContext = {
    ...DEFAULT_TRANSFORM_CONTEXT,
    ...options.context,
    lineage,
  };
  const registry = options.registry ?? resolveTransformRegistry();
  const inputRows = tagSourceIndex(rows);
  lineage.recordSource(inputRows);

  if (!operations || operations.length === 0) return { rows: inputRows, lineage };

  const out = operations.reduce((acc, operation, operationIndex) => {
    const definition = transformDefinitionOf(operation, registry);
    const parsed = parseTransformOperation(definition, operation);
    const inputFields = definition.inputFields?.(parsed, context) ?? [];
    const outputFields = transformOutputFields(definition, parsed, context);
    const outputRows = definition.apply(acc, parsed, context);
    lineage.recordTransformStep({
      operationIndex,
      operation,
      inputRows: acc,
      outputRows,
      inputFields,
      outputFields,
    });
    return outputRows;
  }, inputRows);

  return { rows: out, lineage };
};
