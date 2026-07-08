import { JsonObjectSchema } from '@retikz/core';

import type { AnyTransformDefinition, FieldCollector, TransformContext } from '../contract';
import type { ExternalRow, TransformOperation } from '../schemas';

import { resolveTransformRegistry } from '../providers';
import { readSourceIndex, readSourceIndices, withGroupProvenance } from './provenance';

/** 默认 transform 上下文：使用 data provenance symbol 标记，不把来源信息写进 JSON IR。 */
export const DEFAULT_TRANSFORM_CONTEXT: TransformContext = {
  readSourceIndex,
  readSourceIndices,
  groupProvenance: withGroupProvenance,
};

/** 解析并校验单个 transform operation；返回可安全传给对应 definition 的宽类型。 */
const parseTransformOperation = (definition: AnyTransformDefinition, operation: TransformOperation): never => {
  JsonObjectSchema.parse(operation);
  const parsed = definition.schema.parse(operation) as never;
  JsonObjectSchema.parse(parsed);
  return parsed;
};

/** 查找 transform definition；未知 kind 必须 fail-loud，避免静默跳过结构性数据变换。 */
const transformDefinitionOf = (
  operation: TransformOperation,
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
  transform: TransformOperation,
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
  operations?: Array<TransformOperation>,
  registry: ReadonlyMap<string, AnyTransformDefinition> = resolveTransformRegistry(),
  context: TransformContext = DEFAULT_TRANSFORM_CONTEXT,
): Array<ExternalRow> => {
  if (!operations || operations.length === 0) return rows;
  return operations.reduce((acc, operation) => {
    const definition = transformDefinitionOf(operation, registry);
    return definition.apply(acc, parseTransformOperation(definition, operation), context);
  }, rows);
};
