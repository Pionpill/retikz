import { JsonObjectSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { MarkNodeLabelListSchema } from '@retikz/plot';
import { z } from 'zod';

/** Point recipe 中可复用的字段绑定通道
 *
 * Chart Source 只保存字段名；resolver 在进入 Plot 前把字段名转换为 Plot
 * 的 `{ kind: 'field', value }` 通道
 */
export const PointEncodingFieldsShape = {
  x: NonBlankStringSchema.describe('Field bound to the horizontal position role'),
  y: NonBlankStringSchema.describe('Field bound to the vertical position role'),
  color: NonBlankStringSchema.optional().describe('Field bound to the color role'),
  size: NonBlankStringSchema.optional().describe('Field bound to the size role'),
  opacity: NonBlankStringSchema.optional().describe('Field bound to the opacity role'),
  shape: NonBlankStringSchema.optional().describe('Field bound to the shape role'),
} as const;

/** Point recipe 的位置与视觉字段绑定 */
export const PointEncodingSchema = z
  .strictObject(PointEncodingFieldsShape)
  .describe('Point Chart field-bound encodings');

/** Point mark 可选的字段绑定角色
 *
 * mark 省略的角色由当前 recipe 的 Chart context 继承
 */
export const PointMarkEncodingSchema = z
  .strictObject({
    x: NonBlankStringSchema.optional().describe('Optional horizontal position field override'),
    y: NonBlankStringSchema.optional().describe('Optional vertical position field override'),
    color: NonBlankStringSchema.optional().describe('Optional color field override'),
    size: NonBlankStringSchema.optional().describe('Optional size field override'),
    opacity: NonBlankStringSchema.optional().describe('Optional opacity field override'),
    shape: NonBlankStringSchema.optional().describe('Optional shape field override'),
  })
  .describe('Point Chart mark field-bound encodings');

/** Chart-owned Point properties 的常量值
 *
 * 这些字段在 Source 中使用最终常量值；字段绑定必须放在 `encodings` 中
 */
export const PointPropertiesSchema = z
  .strictObject({
    color: z.string().min(1).optional().describe('Constant point color'),
    textColor: z.string().min(1).optional().describe('Constant point text color'),
    size: z.number().finite().nonnegative().optional().describe('Constant point radius'),
    shape: z.string().min(1).optional().describe('Constant point shape'),
    fill: z
      .union([z.string().min(1), JsonObjectSchema])
      .optional()
      .describe('Constant point fill paint'),
    stroke: z
      .union([z.string().min(1), JsonObjectSchema])
      .optional()
      .describe('Constant point stroke paint'),
    strokeWidth: z.number().finite().nonnegative().optional().describe('Constant point stroke width'),
    fillOpacity: z.number().finite().min(0).max(1).optional().describe('Constant point fill opacity'),
    strokeOpacity: z.number().finite().min(0).max(1).optional().describe('Constant point stroke opacity'),
    opacity: z.number().finite().min(0).max(1).optional().describe('Constant point opacity'),
    rotate: z.number().finite().optional().describe('Constant point rotation'),
    minimumSize: z.union([z.number().finite().nonnegative(), JsonObjectSchema]).optional(),
    zIndex: z.number().int().optional().describe('Constant point drawing order'),
    align: z.enum(['start', 'middle', 'end']).optional().describe('Constant point text alignment'),
    lineHeight: z.number().finite().positive().optional().describe('Constant point line height'),
    maxTextWidth: z.number().finite().positive().optional().describe('Constant point maximum text width'),
    cornerRadius: z.number().finite().nonnegative().optional().describe('Constant point corner radius'),
    scale: z.union([z.number().finite(), JsonObjectSchema]).optional().describe('Constant point scale'),
    padding: z.union([z.number().finite().nonnegative(), JsonObjectSchema]).optional(),
    margin: z.union([z.number().finite().nonnegative(), JsonObjectSchema]).optional(),
    dashed: z.boolean().optional(),
    dotted: z.boolean().optional(),
    dashPattern: z.array(z.number().finite().nonnegative()).min(1).optional(),
    font: JsonObjectSchema.optional(),
    boundary: z.union([JsonObjectSchema, z.boolean()]).optional(),
    shadow: z.union([z.string().min(1), JsonObjectSchema]).optional(),
    blendMode: z.string().min(1).optional(),
    dx: z.number().finite().optional(),
    dy: z.number().finite().optional(),
    label: MarkNodeLabelListSchema.optional(),
  })
  .describe('Point Chart constant properties');

/** Point recipe theme 的稀疏覆盖 schema */
export const PointRecipeThemeOverridesSchema = z
  .strictObject({
    axisEnabled: z.boolean().optional(),
    axisGridEnabled: z.boolean().optional(),
    legendEnabled: z.boolean().optional(),
  })
  .describe('Sparse Point recipe theme overrides');

/** Point recipe theme 的完整消费 schema */
export const PointRecipeThemeResolutionSchema = z
  .strictObject({
    axisEnabled: z.boolean(),
    axisGridEnabled: z.boolean(),
    legendEnabled: z.boolean(),
  })
  .describe('Complete Point recipe theme tokens');

/** Point mark payload 的公共 schema */
export const PointMarkSchema = z
  .strictObject({
    kind: z.literal('scatter'),
    encodings: PointMarkEncodingSchema.optional(),
    properties: PointPropertiesSchema.optional(),
  })
  .describe('Chart-owned Point mark payload');

export type IRPointEncoding = z.infer<typeof PointEncodingSchema>;
export type IRPointMarkEncoding = z.infer<typeof PointMarkEncodingSchema>;
export type IRPointProperties = z.infer<typeof PointPropertiesSchema>;
export type IRPointMark = z.infer<typeof PointMarkSchema>;
