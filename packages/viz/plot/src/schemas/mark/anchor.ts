import { NodeTargetSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { number, strictObject, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { PositionEncodingSchema } from '../encoding';

/** 校验当前结果行的身份字段或固定身份 */
export const MarkKeyInputSchema = union([
  strictObject({ field: NonBlankStringSchema }),
  strictObject({ value: union([NonBlankStringSchema, number()]) }),
]);

/** 校验同一视图内的 Mark 实例目标 */
export const MarkTargetSchema = strictObject({
  mark: NonBlankStringSchema.describe('Explicit target mark id in the current plot view'),
  key: MarkKeyInputSchema.describe('Target identity value or field in the current connection row'),
  anchor: NodeTargetSchema.shape.anchor,
  offset: NodeTargetSchema.shape.offset,
  boundary: NodeTargetSchema.shape.boundary,
});

/** 校验坐标输入或 Mark 实例引用 */
export const PathEndpointSchema = union([PositionEncodingSchema, MarkTargetSchema]);

export type IRPlotMarkTarget = ZodInfer<typeof MarkTargetSchema>;
export type IRPlotPathEndpoint = ZodInfer<typeof PathEndpointSchema>;

/** 校验生成 Core 节点或坐标标识的标记局部稳定锚点规则 */
export const AnchorIdSchema = strictObject({
  prefix: NonBlankStringSchema.optional().describe(
    'Optional id namespace under the current plot; defaults to the mark id, or mark.<index> when the mark has no id',
  ),
  template: NonBlankStringSchema.optional().describe(
    'JSON-safe id template supporting {plotId}, {markId}, {markIndex}, {index}, and {field:name} placeholders',
  ),
  generator: NonBlankStringSchema.optional().describe(
    'Runtime generator key resolved from PlotsLoweringOptions.anchorIdGenerators; the function itself is not stored in the IRPlot',
  ),
})
  .superRefine((spec, ctx) => {
    const count = [spec.template, spec.generator].filter(value => value !== undefined).length;
    if (count > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'anchorId template and generator are mutually exclusive',
      });
    }
  })
  .describe('Mark-scoped stable anchor id rule for generated core Node / Coordinate ids');

/** 锚点的字段、模板和运行时生成器共同构成唯一标识来源 */
export const hasValidAnchorSource = (mark: {
  properties?: { anchorId?: { template?: string; generator?: string } };
  encodings?: { anchorId?: string };
}): boolean => {
  const rule = mark.properties?.anchorId;
  const field = mark.encodings?.anchorId;
  if (rule === undefined && field === undefined) return true;
  return [field, rule?.template, rule?.generator].filter(value => value !== undefined).length === 1;
};

/** mark 锚点 id 声明 */
export type IRPlotAnchorId = ZodInfer<typeof AnchorIdSchema>;
