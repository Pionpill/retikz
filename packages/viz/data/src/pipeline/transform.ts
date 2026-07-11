import { JsonObjectSchema } from '@retikz/core';

import type {
  AnyTransformDefinition,
  DataLineageOptions,
  DataLineageRun,
  FieldCollector,
  TransformContext,
} from '../contract';
import type { ExternalRow, IRDataTransform } from '../schemas';

import { resolveTransformRegistry } from '../providers';
import { createDataLineageRecorder } from './lineage';
import { readSourceIndex, readSourceIndices, tagSourceIndex, withGroupProvenance } from './provenance';

/** 默认 transform 上下文：使用 data provenance symbol 标记，不把来源信息写进 JSON IR。 */
export const DEFAULT_TRANSFORM_CONTEXT: TransformContext = {
  readSourceIndex,
  readSourceIndices,
  groupProvenance: withGroupProvenance,
};

/** 解析并校验单个 transform operation；返回可安全传给对应 definition 的宽类型。 */
const parseTransformOperation = (definition: AnyTransformDefinition, operation: IRDataTransform): never => {
  JsonObjectSchema.parse(operation);
  const parsed = definition.schema.parse(operation) as never;
  JsonObjectSchema.parse(parsed);
  return parsed;
};

/** 查找 transform definition；未知 kind 必须 fail-loud，避免静默跳过结构性数据变换。 */
const transformDefinitionOf = (
  operation: IRDataTransform,
  registry: ReadonlyMap<string, AnyTransformDefinition>,
): AnyTransformDefinition => {
  const definition = registry.get(operation.kind);
  if (definition === undefined) {
    throw new Error(
      `applyTransforms: transform kind "${operation.kind}" is not registered; pass a TransformDefinition via options.transformDefinitions`,
    );
  }
  return definition;
};

/** 收集 transform 读取的源字段，并登记 transform 派生输出字段以供 strict model 排除。 */
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
  for (const output of definition.outputFields?.(parsed, context) ?? []) derivedOutputs.add(output);
};

/**
 * 按声明顺序折叠应用 transform。
 * @description data 内置 transform 包含 sort / summarize / select / annotate；宿主可通过 registry 注入更多 transform。
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

/** applyTransformsWithLineage 的运行时选项。 */
export type ApplyTransformsWithLineageOptions = {
  /** transform registry；缺省时使用 data 内置 registry。 */
  registry?: ReadonlyMap<string, AnyTransformDefinition>;
  /** transform context 增量；缺省 helper 会自动补齐。 */
  context?: Partial<TransformContext>;
  /** lineage 开关；缺省等价于 `{}`，只记录轻量 source / step。 */
  lineage?: DataLineageOptions;
};

/** applyTransformsWithLineage 的运行结果。 */
export type ApplyTransformsWithLineageResult = {
  /** transform 后的数据行。 */
  rows: Array<ExternalRow>;
  /** 本次 transform 运行的 lineage 事件。 */
  lineage: DataLineageRun;
};

/**
 * 按声明顺序执行 transform，并返回运行时 lineage。
 * @description 该入口不改变 IRDataTransform schema；lineage 只通过返回值暴露，不写入 JSON IR。
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
    const outputFields = definition.outputFields?.(parsed, context) ?? [];
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
