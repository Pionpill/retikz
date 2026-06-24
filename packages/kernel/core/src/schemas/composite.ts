import { z } from 'zod';

/**
 * Tier 2 节点基础 schema：定义所有 composite 必填的 namespace / type
 * @description domain 包用 zod `.extend()` 继承本 schema，把 namespace / type 收窄为 literal 并加领域字段，
 *   产出像 Node 一样字段一等、每字段带 describe 的完整节点 schema。core 据 namespace + type 的 literal 路由展开。
 */
export const CompositeBaseSchema = z.object({
  namespace: z
    .string()
    .min(1)
    .describe('Tier 2 domain namespace (e.g. "plot") routing which registered definition expands this node.'),
  type: z
    .string()
    .min(1)
    .describe('Composite type name within the namespace (e.g. "axis"); analogous to a Tier 1 node type.'),
});

/**
 * core 静态校验所有 tier2 节点的开放 schema
 * @description 只校验「有 namespace + type」（passthrough 放行领域字段）；精确字段校验在 compile 期由
 *   `lowerComposites` 用注册的领域 schema `.parse(node)` 完成。tier1 节点无 namespace，与 tier2 互斥分流。
 */
export const CompositeNodeSchema = CompositeBaseSchema.passthrough();

/** Tier 2 开放节点 IR 类型（宽松；精确类型由各 domain schema 的 z.infer 给出） */
export type IRComposite = { namespace: string; type: string } & Record<string, unknown>;
