/** Tier 2 开放节点 IR 类型（宽松；精确类型由各 domain schema 的 z.infer 给出） */
export type IRComposite = { namespace: string; type: string } & Record<string, unknown>;
