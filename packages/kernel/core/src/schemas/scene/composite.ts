import { NonBlankStringSchema, JsonValueSchema } from '@retikz/foundation';
import { strictObject, object } from 'zod';

/** 组合节点共用的命名空间和类型字段 */
const compositeBaseShape = {
  namespace: NonBlankStringSchema.describe('Tier 2 domain namespace that selects the registered definition.'),
  type: NonBlankStringSchema.describe('Composite type name within the namespace.'),
};

/** 校验组合节点的公共字段并拒绝未声明字段 */
export const CompositeBaseSchema = strictObject(compositeBaseShape);

/** 校验组合节点公共字段，并允许领域定义进一步解析的 JSON 扩展字段 */
export const CompositeNodeSchema = object(compositeBaseShape).catchall(JsonValueSchema);

/** Tier 2 开放节点 IR 类型（宽松；精确类型由各 domain schema 的 z.infer 给出） */
export type IRComposite = {
  /** 复合组件所属的注册命名空间 */
  namespace: string;
  /** 命名空间内用于匹配组件定义的类型标识 */
  type: string;
} & Record<string, unknown>;
