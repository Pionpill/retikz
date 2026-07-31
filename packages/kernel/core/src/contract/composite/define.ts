import { z } from 'zod';

import type { IRJsonObject, JsonValue } from '../../schemas';
import type { CompositeDefinition } from './types';

import { cloneAndFreezeJson } from '../../shared/json';

const InspectorBaseKeys = new Set(['bounds', 'overflow', 'alignmentGuides', 'labels']);

/** 校验 inspector local schemas 可从空输入形成 strict、JSON-safe canonical profile */
const validateInspector = (definition: Readonly<Record<string, unknown>>): void => {
  const inspector = definition.inspector;
  if (inspector === undefined) return;
  if (
    typeof definition.compile !== 'function' ||
    definition.artifactSchema === undefined ||
    inspector === null ||
    typeof inspector !== 'object'
  ) {
    throw new Error('defineComposite: inspector requires the compile branch and artifactSchema.');
  }
  const record = inspector as Readonly<Record<string, unknown>>;
  if (record.kind !== 'layout') throw new Error('defineComposite: inspector.kind must be "layout".');
  const inputSchema = record.localOptionsInputSchema;
  const resolvedSchema = record.localOptionsSchema;
  if (!(inputSchema instanceof z.ZodObject)) {
    throw new Error('defineComposite: inspector localOptionsInputSchema must be a direct strict ZodObject.');
  }
  if (!(resolvedSchema instanceof z.ZodType)) {
    throw new Error('defineComposite: inspector localOptionsSchema must be a Zod schema.');
  }
  const conflict = Object.keys(inputSchema.shape).find(key => InspectorBaseKeys.has(key));
  if (conflict !== undefined) {
    throw new Error(`defineComposite: inspector local option "${conflict}" conflicts with a Core Base option.`);
  }
  let sentinel = '__retikzInspectionUnknown__';
  while (Object.hasOwn(inputSchema.shape, sentinel)) sentinel = `_${sentinel}`;
  if (inputSchema.safeParse({ [sentinel]: true }).success) {
    throw new Error('defineComposite: inspector localOptionsInputSchema must reject unknown keys as a strict object.');
  }
  if (!inputSchema.safeParse({}).success) {
    throw new Error('defineComposite: inspector localOptionsInputSchema must accept an empty local options object.');
  }
  const resolved = resolvedSchema.safeParse({});
  if (!resolved.success) {
    throw new Error('defineComposite: inspector localOptionsSchema must resolve an empty local options object.');
  }
  try {
    const frozen = cloneAndFreezeJson(resolved.data, 'Composite inspector local options');
    if (frozen === null || typeof frozen !== 'object' || Array.isArray(frozen)) {
      throw new Error('resolved local options must be a JSON object');
    }
  } catch (cause) {
    throw new Error('defineComposite: inspector localOptionsSchema must resolve to a JSON-safe object.', { cause });
  }
  if (typeof record.inspect !== 'function') {
    throw new Error('defineComposite: inspector.inspect must be a function.');
  }
};

/** 把 composite registration schema 规范化为可读取 provider key 的对象分支 */
const objectSchemasOf = (schema: z.ZodType): Array<z.ZodObject> => {
  if (schema instanceof z.ZodObject) return [schema];
  if (!(schema instanceof z.ZodUnion)) {
    throw new Error(
      'defineComposite: schema must be a ZodObject or a ZodUnion of ZodObject variants extending CompositeBaseSchema.',
    );
  }
  if (schema.options.length === 0) {
    throw new Error('defineComposite: schema union must contain at least one ZodObject option.');
  }

  return schema.options.map((option, index) => {
    if (!(option instanceof z.ZodObject)) {
      throw new Error(
        `defineComposite: schema union option ${index} must be a ZodObject extending CompositeBaseSchema.`,
      );
    }
    return option;
  });
};

/** 从 composite 对象分支中读取并校验共同 namespace / type literal */
const literalValueOf = (schema: z.ZodType, field: 'namespace' | 'type'): string => {
  const objects = objectSchemasOf(schema);
  const values = objects.map((object, index) => {
    const node = object.shape[field];
    if (!(node instanceof z.ZodLiteral) || typeof node.value !== 'string' || node.value.trim().length === 0) {
      const path = objects.length === 1 ? `schema.${field}` : `schema union option ${index}.${field}`;
      throw new Error(`defineComposite: ${path} must be a non-empty z.literal string.`);
    }
    return node.value;
  });
  const expected = values[0];
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    if (value !== expected) {
      throw new Error(
        `defineComposite: schema union option ${index} ${field} literal "${value}" does not match option 0 literal "${expected}".`,
      );
    }
  }
  return expected;
};

/**
 * 定义 Tier 2 composite 注册项
 * @remarks 保留精确 key、节点、artifact 与互斥执行分支，并校验 definition key 与 schema literal 一致
 */
export const defineComposite = <
  const TNamespace extends string,
  const TType extends string,
  TNode,
  TArtifact extends JsonValue = never,
  TLocalShape extends z.ZodRawShape = z.ZodRawShape,
  TResolvedLocalOptions extends IRJsonObject = IRJsonObject,
  const TDefinition extends CompositeDefinition<
    TNode,
    TNamespace,
    TType,
    TArtifact,
    TLocalShape,
    TResolvedLocalOptions
  > = CompositeDefinition<TNode, TNamespace, TType, TArtifact, TLocalShape, TResolvedLocalOptions>,
>(
  definition: CompositeDefinition<TNode, TNamespace, TType, TArtifact, TLocalShape, TResolvedLocalOptions> &
    TDefinition,
): TDefinition => {
  const hasExpand = typeof definition.expand === 'function';
  const hasCompile = typeof definition.compile === 'function';
  if (hasExpand === hasCompile) {
    throw new Error('defineComposite: exactly one of expand or compile must be provided.');
  }
  const runtimeArtifactSchema = (definition as { artifactSchema?: unknown }).artifactSchema;
  if (hasExpand && runtimeArtifactSchema !== undefined) {
    throw new Error('defineComposite: artifactSchema is only valid for the compile branch.');
  }
  validateInspector(definition);
  const namespace = literalValueOf(definition.schema, 'namespace');
  const type = literalValueOf(definition.schema, 'type');
  if (definition.namespace !== namespace) {
    throw new Error(
      `defineComposite: declared namespace "${definition.namespace}" does not match schema literal "${namespace}".`,
    );
  }
  if (definition.type !== type) {
    throw new Error(`defineComposite: declared type "${definition.type}" does not match schema literal "${type}".`);
  }
  return definition;
};
