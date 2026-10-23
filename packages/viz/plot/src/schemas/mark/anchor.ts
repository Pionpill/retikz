import { AnchorRefSchema, BoundarySchema, PositionSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { boolean, strictObject, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { PositionEncodingSchema } from '../encoding';

/** 校验生成 Core 节点或坐标标识的标记局部稳定锚点规则 */
export const AnchorIdSchema = strictObject({
  prefix: NonBlankStringSchema.optional().describe(
    'Optional id namespace under the current plot; defaults to the mark id, or mark.<index> when the mark has no id',
  ),
  template: NonBlankStringSchema.optional().describe(
    'JSON-safe id template supporting {plotId}, {markId}, {markIndex}, {index}, and {field:name} placeholders',
  ),
  generator: NonBlankStringSchema.optional().describe(
    'Runtime generator key resolved from LowerPlotsOptions.anchorIdGenerators; the function itself is not stored in the IRPlot',
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

const anchorTargetFields = {
  anchor: AnchorRefSchema.optional().describe('Optional core anchor ref on the resolved target id'),
  offset: PositionSchema.optional().describe('Optional world-space offset applied after anchor resolution'),
  boundary: union([BoundarySchema, boolean()])
    .optional()
    .describe('Core target boundary override; true means shape, false omits the override'),
};

const GeneratedAnchorPlotTargetRefSchema = strictObject({
  anchorId: AnchorIdSchema.describe('Anchor id rule evaluated against the current relation row'),
  ...anchorTargetFields,
}).describe('Generated anchor target reference evaluated from the current relation row');

const ProjectedPlotTargetRefSchema = strictObject({
  anchorId: AnchorIdSchema.optional().describe('Optional id rule for the generated projected Coordinate'),
  ...anchorTargetFields,
}).describe('Projected coordinate target from the current relation row');

/** 校验关系使用的生成锚点或投影坐标目标 */
export const PlotTargetRefSchema = union([GeneratedAnchorPlotTargetRefSchema, ProjectedPlotTargetRefSchema]).describe(
  'Relation target reference: generated mark anchor id or projected coordinate',
);

/** 校验关系目标的字段依赖，固定引用与构造仍由 properties 表达 */
export const PlotTargetEncodingSchema = strictObject({
  position: PositionEncodingSchema.optional(),
  anchorId: NonBlankStringSchema.optional(),
}).describe('Relation target position or generated anchor field dependencies');

/** mark 锚点 id 声明 */
export type IRPlotAnchorId = ZodInfer<typeof AnchorIdSchema>;

/** plot 内目标引用，可指向数据行、系列或锚点 */
export type IRPlotTargetRef = ZodInfer<typeof PlotTargetRefSchema>;
