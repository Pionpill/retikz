import { z } from 'zod';

import type { CompositeDefinition } from './types';

/** 从 composite schema 中读取并校验 namespace / type literal。 */
const literalValueOf = (schema: CompositeDefinition['schema'], field: 'namespace' | 'type'): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('defineComposite: schema must be a ZodObject extending CompositeBaseSchema.');
  }
  const node = schema.shape[field];
  if (!(node instanceof z.ZodLiteral) || typeof node.value !== 'string' || node.value.trim().length === 0) {
    throw new Error(`defineComposite: schema.${field} must be a non-empty z.literal string.`);
  }
  return node.value;
};

/**
 * 定义 Tier 2 composite 注册项。
 * @remarks 保留 `expand` 的节点泛型，并校验 definition key 与 schema literal 一致。
 */
export const defineComposite = <T>(definition: CompositeDefinition<T>): CompositeDefinition => {
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
  return definition as CompositeDefinition;
};
