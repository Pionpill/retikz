import { z } from 'zod';

import type { CompositeDefinition } from './types';

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
 * 注册一个 Tier 2 composite（保留 `expand` 的强类型节点参数）
 * @description domain 包用它注册：`expand` 的 node 自动推断为 `z.infer<typeof schema>`；返回值擦除泛型，
 *   可放进 `CompileOptions.composites: Array<CompositeDefinition>`。对齐其他扩展面的 `define*` helper。
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
