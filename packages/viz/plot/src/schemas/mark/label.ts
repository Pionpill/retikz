import { PathLabelSchema, NodeLabelSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, strictObject, string, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

/** 校验标签的固定文本内容 */
export const MarkLabelTextSchema = NodeLabelSchema.shape.text.describe('Fixed label text');

/** 校验附着于 Core 节点宿主的标签，几何字段复用节点标签契约 */
export const MarkNodeLabelSchema = strictObject({
  ...NodeLabelSchema.shape,
  text: MarkLabelTextSchema.optional(),
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

/** 校验附着于路径宿主的标签，几何字段复用 Core 路径标签契约 */
export const MarkPathLabelSchema = strictObject({
  ...PathLabelSchema.shape,
  text: MarkLabelTextSchema.optional(),
  displayFormat: NonBlankStringSchema.optional(),
}).describe(
  'Plot label attached to a path-like PathLabel host; all geometry fields are inherited from core PathLabelSchema',
);

/** 校验单个或按声明顺序排列的节点宿主标签 */
export const MarkNodeLabelListSchema = union([
  string(),
  MarkNodeLabelSchema,
  array(union([string(), MarkNodeLabelSchema])).min(1),
]).describe('Single or multiple node-host labels; array order is preserved');

/** 校验单个或按声明顺序排列的路径宿主标签 */
export const MarkPathLabelListSchema = union([
  string(),
  MarkPathLabelSchema,
  array(union([string(), MarkPathLabelSchema])).min(1),
]).describe('Single or multiple path-host labels; array order is preserved');

/** 标记标签内容的绑定 */
export type IRPlotMarkLabelText = ZodInfer<typeof MarkLabelTextSchema>;

/** 与 Core NodeLabelSchema 对齐的宿主数据项标签配置 */
export type IRPlotMarkNodeLabel = ZodInfer<typeof MarkNodeLabelSchema>;

/** 与 Core PathLabelSchema 对齐的路径宿主标签配置 */
export type IRPlotMarkPathLabel = ZodInfer<typeof MarkPathLabelSchema>;

/** 单个或数组形式的节点标签声明 */
export type IRPlotMarkNodeLabelList = ZodInfer<typeof MarkNodeLabelListSchema>;

/** 单个或数组形式的路径标签声明 */
export type IRPlotMarkPathLabelList = ZodInfer<typeof MarkPathLabelListSchema>;
