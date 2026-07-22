import type { ZodType } from 'zod';

import type { IRChild } from '../../schemas';

/**
 * Tier 2 composite 注册项
 * @description 描述一个 composite 节点的 schema 和展开逻辑；定义本身不进入 IR
 */
export type CompositeDefinition<T = unknown> = {
  /** composite IR 节点引用的 provider namespace */
  namespace: string;
  /** composite IR 节点引用的 provider type */
  type: string;
  /** 完整节点 schema；单个对象或对象 union 的 namespace / type 必须是相同 literal */
  schema: ZodType<T>;
  /** 把该 composite 节点展开成 Tier 1 IR 的纯函数；据节点字段不同产不同子树 */
  expand: (node: T) => IRChild | Array<IRChild>;
};
