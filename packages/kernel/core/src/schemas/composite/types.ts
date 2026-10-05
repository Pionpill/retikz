/** Tier 2 开放节点 IR 类型（宽松；精确类型由各 domain schema 的 z.infer 给出） */
export type IRComposite = {
  /** 复合组件所属的注册命名空间 */
  namespace: string;
  /** 命名空间内用于匹配组件定义的类型标识 */
  type: string;
} & Record<string, unknown>;
