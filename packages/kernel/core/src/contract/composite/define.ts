import { assertNonEmptyString } from '@retikz/foundation';
import { z } from 'zod';

import type { JsonValue } from '../../schemas';
import type { CompositeDefinition } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 把 composite registration schema 规范化为可读取 provider key 的对象分支 */
const objectSchemasOf = (schema: z.ZodType): Array<z.ZodObject> => {
  if (schema instanceof z.ZodObject) return [schema];
  if (!(schema instanceof z.ZodUnion)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      'defineComposite: schema must be a ZodObject or a ZodUnion of ZodObject variants extending CompositeBaseSchema.',
    );
  }
  if (schema.options.length === 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      'defineComposite: schema union must contain at least one ZodObject option.',
    );
  }

  return schema.options.map((option, index) => {
    if (!(option instanceof z.ZodObject)) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Contract,
        `defineComposite: schema union option ${index} must be a ZodObject extending CompositeBaseSchema.`,
      );
    }
    return option;
  });
};

/** 校验 schema literal 字符串并直接保留 Foundation 原子错误 */
const isNonEmptyLiteralString = (value: unknown, label: string): value is string => {
  if (typeof value !== 'string') return false;
  assertNonEmptyString(value, label);
  return true;
};

/** 从 composite 对象分支中读取并校验共同 namespace / type literal */
const literalValueOf = (schema: z.ZodType, field: 'namespace' | 'type'): string => {
  const objects = objectSchemasOf(schema);
  const values = objects.map((object, index) => {
    const node = object.shape[field];
    const path = objects.length === 1 ? `schema.${field}` : `schema union option ${index}.${field}`;
    const message = `defineComposite: ${path} must be a non-empty z.literal string.`;
    if (!(node instanceof z.ZodLiteral) || !isNonEmptyLiteralString(node.value, `defineComposite: ${path}`)) {
      throw new RetikzCoreError(RetikzCoreErrorCode.Contract, message);
    }
    return node.value;
  });
  const expected = values[0];
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    if (value !== expected) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Contract,
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
  const namespace = literalValueOf(definition.schema, 'namespace');
  const type = literalValueOf(definition.schema, 'type');
  if (definition.namespace !== namespace) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      `defineComposite: declared namespace "${definition.namespace}" does not match schema literal "${namespace}".`,
    );
  }
  if (definition.type !== type) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      `defineComposite: declared type "${definition.type}" does not match schema literal "${type}".`,
    );
  }
  return definition;
};
