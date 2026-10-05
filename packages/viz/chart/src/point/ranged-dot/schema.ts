import {
  BlendMode,
  CssColorSchema,
  DropShadowSchema,
  PaintSchema,
  PathLineCapSchema,
  PathLineJoinSchema,
  ShadowPreset,
  ShapeNameSchema,
  StrokeDashPatternSchema,
  OpacitySchema,
  StrokeWidthSchema,
} from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { array, boolean, enum as zodEnum, literal, number, strictObject, union } from 'zod';

import { createChartSourceSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import { PointAutoPaddingSchema, PointPositionDomainPaddingSchema, PointRecipeGuidesSchema } from '../shared';
import { RangedDotChartEncodingsSchema } from './encoding-schema';

/** Ranged Dot endpoint 允许的常量 Point 表现 */
export const RangedDotPointPropertiesSchema = strictObject({
  color: CssColorSchema.optional(),
  size: NonNegativeNumberSchema.optional(),
  shape: ShapeNameSchema.optional(),
  fill: union([CssColorSchema, PaintSchema]).optional(),
  stroke: union([CssColorSchema, PaintSchema]).optional(),
  strokeWidth: StrokeWidthSchema.optional(),
  fillOpacity: OpacitySchema.optional(),
  strokeOpacity: OpacitySchema.optional(),
  opacity: OpacitySchema.optional(),
  rotate: number().optional(),
  minimumSize: NonNegativeNumberSchema.optional(),
}).describe('Ranged Dot endpoint constant Point appearance');

/** Ranged Dot connector 允许的常量 Path 表现 */
export const RangedDotRangePropertiesSchema = strictObject({
  stroke: union([CssColorSchema, PaintSchema]).optional(),
  strokeWidth: StrokeWidthSchema.optional(),
  strokeOpacity: OpacitySchema.optional(),
  opacity: OpacitySchema.optional(),
  lineCap: PathLineCapSchema.optional(),
  lineJoin: PathLineJoinSchema.optional(),
  dashPattern: StrokeDashPatternSchema.optional(),
  shadow: union([zodEnum(ShadowPreset), DropShadowSchema]).optional(),
  blendMode: zodEnum(BlendMode).optional(),
}).describe('Ranged Dot connector constant Path appearance');

/** 范围点标记的作者侧成员属性 */
const RangedDotMarkPropertiesSchema = strictObject({
  point: RangedDotPointPropertiesSchema.optional(),
  startPoint: RangedDotPointPropertiesSchema.optional(),
  endPoint: RangedDotPointPropertiesSchema.optional(),
  range: RangedDotRangePropertiesSchema.optional(),
}).describe('Ranged Dot member appearance properties');

/** 范围点配方的属性 */
export const RangedDotChartPropertiesSchema = RangedDotMarkPropertiesSchema.extend({
  autoPadding: PointAutoPaddingSchema.optional(),
  domainPadding: PointPositionDomainPaddingSchema.optional(),
}).describe('Ranged Dot recipe properties');

/** Ranged Dot authored mark 允许覆盖的直接字段 */
export const RangedDotMarkEncodingsSchema = strictObject({
  category: NonBlankStringSchema.optional(),
  start: NonBlankStringSchema.optional(),
  end: NonBlankStringSchema.optional(),
}).describe('Ranged Dot authored mark direct field overrides');

/** 范围点标记的作者侧载荷 */
export const RangedDotChartMarkSchema = strictObject({
  kind: literal(ChartType.RangedDot),
  override: boolean().optional(),
  encodings: RangedDotMarkEncodingsSchema.optional(),
  properties: RangedDotMarkPropertiesSchema.optional(),
}).describe('Ranged Dot Chart mark payload');

/** 范围点配方的封装结构 */
export const RangedDotChartRecipeSchema = strictObject({
  chartType: literal(ChartType.RangedDot),
  encodings: RangedDotChartEncodingsSchema,
  properties: RangedDotChartPropertiesSchema.optional(),
  guides: PointRecipeGuidesSchema.optional(),
  marks: array(RangedDotChartMarkSchema).optional(),
}).describe('Ranged Dot Chart recipe payload');

/** 校验范围点图精确输入结构的 schema */
export const RangedDotChartSchema = createChartSourceSchema(ChartFamily.Point, RangedDotChartRecipeSchema).describe(
  'Ranged Dot Chart Source IR',
);

/** 范围点图的精确输入 IR */
export type IRRangedDotChart = ZodInfer<typeof RangedDotChartSchema>;

/** 范围点配方的 IR */
export type IRRangedDotChartRecipe = ZodInfer<typeof RangedDotChartRecipeSchema>;

/** Ranged Dot recipe 字段映射 */
export type IRRangedDotChartEncodings = ZodInfer<typeof RangedDotChartEncodingsSchema>;

/** Ranged Dot recipe 与 mark 共用的 member 属性 */
export type IRRangedDotChartProperties = ZodInfer<typeof RangedDotChartPropertiesSchema>;

/** Ranged Dot endpoint 常量属性 */
export type IRRangedDotPointProperties = ZodInfer<typeof RangedDotPointPropertiesSchema>;

/** Ranged Dot connector 常量属性 */
export type IRRangedDotRangeProperties = ZodInfer<typeof RangedDotRangePropertiesSchema>;

/** 范围点标记的作者侧 IR */
export type IRRangedDotMark = ZodInfer<typeof RangedDotChartMarkSchema>;
