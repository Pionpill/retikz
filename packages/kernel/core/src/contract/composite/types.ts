import type { ZodType } from 'zod';

import type { IRChild } from '../../schemas';

/**
 * Tier 2 composite 注册项
 * @description domain 包注册一个 Tier 2 type 的全部契约。`schema` 是完整节点 schema（extend `CompositeBaseSchema`，
 *   含 namespace / type literal + 字段 + describe）；`expand` 收 `schema.parse` 后的强类型节点、产 Tier 1。
 *   definition 显式声明 namespace / type，`defineComposite` 会与 schema literal 对账并保留强类型 `expand`。
 */
export type CompositeDefinition<T = unknown> = {
  /** Provider namespace referenced by composite IR nodes. */
  namespace: string;
  /** Provider type referenced by composite IR nodes. */
  type: string;
  /** 完整节点 schema（extend CompositeBaseSchema；namespace / type 为 literal） */
  schema: ZodType<T>;
  /** 把该 composite 节点展开成 Tier 1 IR 的纯函数；据节点字段不同产不同子树 */
  expand: (node: T) => IRChild | Array<IRChild>;
};
