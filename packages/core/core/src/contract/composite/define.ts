import type { CompositeDefinition } from './types';

/**
 * 注册一个 Tier 2 composite（保留 `expand` 的强类型节点参数）
 * @description domain 包用它注册：`expand` 的 node 自动推断为 `z.infer<typeof schema>`；返回值擦除泛型，
 *   可放进 `CompileOptions.composites: Array<CompositeDefinition>`。对齐其他扩展面的 `define*` helper。
 */
export const defineComposite = <T>(definition: CompositeDefinition<T>): CompositeDefinition =>
  definition as CompositeDefinition;
