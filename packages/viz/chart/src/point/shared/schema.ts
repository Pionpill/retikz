import {
  BoxSpacingSchema,
  CssColorSchema,
  GraphicOpacityValueSchema,
  ShapeNameSchema,
  StrokeDashPatternSchema,
  StrokeWidthSchema,
} from '@retikz/core';
import {
  JsonObjectSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { MarkNodeLabelListSchema, PlotDomainPaddingKind, PointAutoPaddingSchema } from '@retikz/plot';
import type { infer as ZodInfer, ZodType } from 'zod';
import { boolean, discriminatedUnion, literal, number, strictObject, union, enum as zodEnum } from 'zod';

export { PointAutoPaddingSchema } from '@retikz/plot';

export type IRPointAutoPadding = ZodInfer<typeof PointAutoPaddingSchema>;

const pointPositionDomainPaddingFields = Object.keys(BoxSpacingSchema.shape);

const PointPositionDomainPaddingRangeSchema = strictObject({
  kind: literal(PlotDomainPaddingKind.Range).optional().describe('Domain padding unit; omitted means range'),
  ...BoxSpacingSchema.shape,
});

/** 复用间距字段并将比例限制在 1 以下 */
const createRatioSpacingSchema = (field: keyof typeof BoxSpacingSchema.shape) =>
  BoxSpacingSchema.shape[field]
    .unwrap()
    .lt(1)
    .optional()
    .describe(BoxSpacingSchema.shape[field].description ?? '');

const PointPositionDomainPaddingObjectSchema = discriminatedUnion('kind', [
  PointPositionDomainPaddingRangeSchema,
  PointPositionDomainPaddingRangeSchema.extend({
    kind: literal(PlotDomainPaddingKind.Ratio).describe('Domain padding measured as a source-domain-span ratio'),
    default: createRatioSpacingSchema('default'),
    x: createRatioSpacingSchema('x'),
    y: createRatioSpacingSchema('y'),
    left: createRatioSpacingSchema('left'),
    right: createRatioSpacingSchema('right'),
    top: createRatioSpacingSchema('top'),
    bottom: createRatioSpacingSchema('bottom'),
  }),
]).refine(value => pointPositionDomainPaddingFields.some(field => value[field as keyof typeof value] !== undefined), {
  message: 'at least one position domain padding value is required',
});

/** 校验位置尺度的共享或按轴分别设置的连续定义域留白 */
export const PointPositionDomainPaddingSchema = union([
  NonNegativeNumberSchema,
  PointPositionDomainPaddingObjectSchema,
]).describe('Shared or per-role continuous position domain padding');

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
  autoPadding: PointAutoPaddingSchema.optional(),
  color: CssColorSchema.optional().describe('Constant point color'),
  textColor: CssColorSchema.optional().describe('Constant point text color'),
  size: NonNegativeNumberSchema.optional().describe('Constant point radius'),
  shape: ShapeNameSchema.optional().describe('Constant point shape'),
  fill: union([CssColorSchema, JsonObjectSchema]).optional().describe('Constant point fill paint'),
  stroke: union([CssColorSchema, JsonObjectSchema]).optional().describe('Constant point stroke paint'),
  strokeWidth: StrokeWidthSchema.optional().describe('Constant point stroke width'),
  opacity: GraphicOpacityValueSchema.optional().describe('Constant point opacity'),
  rotate: number().optional().describe('Constant point rotation'),
  minimumSize: union([NonNegativeNumberSchema, JsonObjectSchema]).optional(),
  zIndex: number().int().optional().describe('Constant point drawing order'),
  align: zodEnum(['start', 'middle', 'end']).optional().describe('Constant point text alignment'),
  lineHeight: PositiveNumberSchema.optional().describe('Constant point line height'),
  maxTextWidth: PositiveNumberSchema.optional().describe('Constant point maximum text width'),
  cornerRadius: NonNegativeNumberSchema.optional().describe('Constant point corner radius'),
  scale: union([number(), JsonObjectSchema]).optional().describe('Constant point scale'),
  padding: union([NonNegativeNumberSchema, JsonObjectSchema]).optional(),
  margin: union([NonNegativeNumberSchema, JsonObjectSchema]).optional(),
  dashed: boolean().optional(),
  dotted: boolean().optional(),
  dashPattern: StrokeDashPatternSchema.optional(),
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

/** Point recipe 生成默认 guide 的稀疏控制项 */
export const PointRecipeGuidesSchema = strictObject({
  axis: boolean().optional().describe('Whether the recipe generates default axis guides'),
  grid: boolean().optional().describe('Whether generated axis guides include grid lines'),
  legend: boolean().optional().describe('Whether the recipe generates default legend guides'),
}).describe('Sparse Point recipe guide generation controls');

/**
 * 为具体 chartType 创建精确的 Point authored mark schema
 * @template TKind mark kind 判别字段的字面量类型
 * @template TEncodingsSchema 校验该 mark 字段映射的 schema 类型
 * @template TPropertiesSchema 校验该 mark 视觉属性的 schema 类型
 */
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

export type IRPointProperties = ZodInfer<typeof PointPropertiesSchema>;

export type IRPointPositionDomainPadding = ZodInfer<typeof PointPositionDomainPaddingSchema>;

export type IRPointRecipeGuides = ZodInfer<typeof PointRecipeGuidesSchema>;
