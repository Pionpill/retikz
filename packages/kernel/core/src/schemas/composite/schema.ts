import { JsonValueSchema, NonBlankStringSchema } from '@retikz/foundation';
import { object, strictObject } from 'zod';

const compositeBaseShape = {
  namespace: NonBlankStringSchema.describe('Tier 2 domain namespace that selects the registered definition.'),
  type: NonBlankStringSchema.describe('Composite type name within the namespace.'),
};

/** 校验组合节点的公共字段并拒绝未声明字段 */
export const CompositeBaseSchema = strictObject(compositeBaseShape);

/** 校验组合节点公共字段，并允许领域定义进一步解析的 JSON 扩展字段 */
export const CompositeNodeSchema = object(compositeBaseShape).catchall(JsonValueSchema);
