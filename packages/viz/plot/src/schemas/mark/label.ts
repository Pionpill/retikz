import { GeometryLabelSchema, NodeLabelSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, strictObject, string, union } from 'zod';

/** 校验标签的固定文本内容 */
export const MarkLabelContentSchema = NodeLabelSchema.shape.text.describe('Fixed label text');

const omitText = <T extends Record<string, unknown>>(shape: T): Omit<T, 'text'> =>
  Object.fromEntries(Object.entries(shape).filter(([key]) => key !== 'text')) as Omit<T, 'text'>;

const nodeLabelShape = omitText(NodeLabelSchema.shape);

const geometryLabelShape = omitText(GeometryLabelSchema.shape);

/** 校验附着于 Core 节点宿主的标签，几何字段复用节点标签契约 */
export const MarkNodeLabelSchema = strictObject({
  ...nodeLabelShape,
  content: MarkLabelContentSchema.optional(),
  displayFormat: NonBlankStringSchema.optional(),
})
  .superRefine((label, ctx) => {
    if (label.placement === 'inside' && label.pin) {
      ctx.addIssue({
        code: 'custom',
        path: ['pin'],
        message: 'Node label pin is only supported for outside placement.',
      });
    }
  })
  .describe(
    'Plot label attached to a core Node.label host; all geometry fields are inherited from core NodeLabelSchema',
  );

/** 校验附着于路径类几何宿主的标签，几何字段复用 Core 几何标签契约 */
export const MarkGeometryLabelSchema = strictObject({
  ...geometryLabelShape,
  content: MarkLabelContentSchema.optional(),
  displayFormat: NonBlankStringSchema.optional(),
}).describe(
  'Plot label attached to a path-like GeometryLabel host; all geometry fields are inherited from core GeometryLabelSchema',
);

/** 校验单个或按声明顺序排列的节点宿主标签 */
export const MarkNodeLabelListSchema = union([
  string(),
  MarkNodeLabelSchema,
  array(union([string(), MarkNodeLabelSchema])).min(1),
]).describe('Single or multiple node-host labels; array order is preserved');

/** 校验单个或按声明顺序排列的几何宿主标签 */
export const MarkGeometryLabelListSchema = union([
  string(),
  MarkGeometryLabelSchema,
  array(union([string(), MarkGeometryLabelSchema])).min(1),
]).describe('Single or multiple geometry-host labels; array order is preserved');
