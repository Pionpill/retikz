import type { infer as ZodInfer } from 'zod';
import type { ZodType } from 'zod';

import { CssColorSchema, JsonObjectSchema } from '@retikz/core';
import { ShapeNameSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { MarkNodeLabelListSchema } from '@retikz/plot';
import { array, boolean, enum as zodEnum, literal, number, strictObject, union } from 'zod';

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
export const PointEncodingSchema = strictObject(PointEncodingFieldsShape).describe('Point Chart field-bound encodings');

/** Point mark 可选的字段绑定角色
 *
 * mark 省略的角色由当前 recipe 的 Chart context 继承
 */
export const PointMarkEncodingSchema = strictObject({
  x: NonBlankStringSchema.optional().describe('Optional horizontal position field override'),
  y: NonBlankStringSchema.optional().describe('Optional vertical position field override'),
  color: NonBlankStringSchema.optional().describe('Optional color field override'),
  size: NonBlankStringSchema.optional().describe('Optional size field override'),
  opacity: NonBlankStringSchema.optional().describe('Optional opacity field override'),
  shape: NonBlankStringSchema.optional().describe('Optional shape field override'),
}).describe('Point Chart mark field-bound encodings');

/** 不允许覆盖尺寸角色的 Point mark 字段绑定 */
export const PointMarkEncodingWithoutSizeSchema = PointMarkEncodingSchema.omit({ size: true }).describe(
  'Point Chart mark field-bound encodings without size',
);

/** Chart-owned Point properties 的常量值
 *
 * 这些字段在 Source 中使用最终常量值；字段绑定必须放在 `encodings` 中
 */
export const PointPropertiesSchema = strictObject({
  color: CssColorSchema.optional().describe('Constant point color'),
  textColor: CssColorSchema.optional().describe('Constant point text color'),
  size: number().nonnegative().optional().describe('Constant point radius'),
  shape: ShapeNameSchema.optional().describe('Constant point shape'),
  fill: union([CssColorSchema, JsonObjectSchema]).optional().describe('Constant point fill paint'),
  stroke: union([CssColorSchema, JsonObjectSchema]).optional().describe('Constant point stroke paint'),
  strokeWidth: number().nonnegative().optional().describe('Constant point stroke width'),
  fillOpacity: number().min(0).max(1).optional().describe('Constant point fill opacity'),
  strokeOpacity: number().min(0).max(1).optional().describe('Constant point stroke opacity'),
  opacity: number().min(0).max(1).optional().describe('Constant point opacity'),
  rotate: number().optional().describe('Constant point rotation'),
  minimumSize: union([number().nonnegative(), JsonObjectSchema]).optional(),
  zIndex: number().int().optional().describe('Constant point drawing order'),
  align: zodEnum(['start', 'middle', 'end']).optional().describe('Constant point text alignment'),
  lineHeight: number().positive().optional().describe('Constant point line height'),
  maxTextWidth: number().positive().optional().describe('Constant point maximum text width'),
  cornerRadius: number().nonnegative().optional().describe('Constant point corner radius'),
  scale: union([number(), JsonObjectSchema]).optional().describe('Constant point scale'),
  padding: union([number().nonnegative(), JsonObjectSchema]).optional(),
  margin: union([number().nonnegative(), JsonObjectSchema]).optional(),
  dashed: boolean().optional(),
  dotted: boolean().optional(),
  dashPattern: array(number().nonnegative()).min(1).optional(),
  font: JsonObjectSchema.optional(),
  boundary: union([JsonObjectSchema, boolean()]).optional(),
  shadow: union([NonBlankStringSchema, JsonObjectSchema]).optional(),
  blendMode: NonBlankStringSchema.optional(),
  dx: number().optional(),
  dy: number().optional(),
  label: MarkNodeLabelListSchema.optional(),
}).describe('Point Chart constant properties');

/** 不允许提供常量尺寸的 Point properties */
export const PointPropertiesWithoutSizeSchema = PointPropertiesSchema.omit({ size: true }).describe(
  'Point Chart constant properties without size',
);

/** Point recipe theme 的稀疏覆盖 schema */
export const PointRecipeThemeOverridesSchema = strictObject({
  axisEnabled: boolean().optional(),
  axisGridEnabled: boolean().optional(),
  legendEnabled: boolean().optional(),
}).describe('Sparse Point recipe theme overrides');

/** Point recipe theme 的完整消费 schema */
export const PointRecipeThemeResolutionSchema = strictObject({
  axisEnabled: boolean(),
  axisGridEnabled: boolean(),
  legendEnabled: boolean(),
}).describe('Complete Point recipe theme tokens');

/** 为具体 chartType 创建精确的 Point authored mark schema */
export const createPointChartMarkSchema = <
  TKind extends string,
  TEncodingsSchema extends ZodType,
  TPropertiesSchema extends ZodType,
>(
  kind: TKind,
  encodingsSchema: TEncodingsSchema,
  propertiesSchema: TPropertiesSchema,
) =>
  strictObject({
    kind: literal(kind),
    override: boolean().optional().describe('Whether to replace the built-in semantic mark group with this kind'),
    encodings: encodingsSchema.optional(),
    properties: propertiesSchema.optional(),
  });

export type IRPointEncoding = ZodInfer<typeof PointEncodingSchema>;
export type IRPointMarkEncoding = ZodInfer<typeof PointMarkEncodingSchema>;
export type IRPointProperties = ZodInfer<typeof PointPropertiesSchema>;
