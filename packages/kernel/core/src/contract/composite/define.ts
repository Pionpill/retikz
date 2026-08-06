import { z } from 'zod';

import type { JsonValue } from '../../schemas';
import type { CompositeDefinition } from './types';

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
  const TDefinition extends CompositeDefinition<TNode, TNamespace, TType, TArtifact> = CompositeDefinition<
    TNode,
    TNamespace,
    TType,
    TArtifact
  >,
>(
  definition: CompositeDefinition<TNode, TNamespace, TType, TArtifact> & TDefinition,
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
