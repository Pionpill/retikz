import type { ZodType } from 'zod';
import type { IRChild } from '../ir';

/**
 * Tier 2 composite 注册项
 * @description domain 包注册一个 Tier 2 type 的全部契约。`schema` 是完整节点 schema（extend `CompositeBaseSchema`，
 *   含 namespace / type literal + 字段 + describe）；`expand` 收 `schema.parse` 后的强类型节点、产 Tier 1。
 *   namespace / type 由 core 从 schema 的 literal 提取，不在此重复写。配 `defineComposite` 获得强类型 `expand`。
 */
export type CompositeDefinition<T = unknown> = {
  /** 完整节点 schema（extend CompositeBaseSchema；namespace / type 为 literal） */
  schema: ZodType<T>;
  /** 把该 composite 节点展开成 Tier 1 IR 的纯函数；据节点字段不同产不同子树 */
  expand: (node: T) => IRChild | Array<IRChild>;
};
