import type { infer as ZodInfer } from 'zod';

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
} from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, number, strictObject, union } from 'zod';

import { createChartSourceSchema, createChartThemeSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import {
  PointPositionDomainPaddingSchema,
  PointRecipeThemeOverridesSchema,
  PointRecipeThemeResolutionSchema,
} from '../shared';
import { RangedDotChartEncodingsSchema } from './encoding-schema';

/** Ranged Dot endpoint 允许的常量 Point 表现 */
export const RangedDotPointPropertiesSchema = strictObject({
  color: CssColorSchema.optional(),
  size: number().nonnegative().optional(),
  shape: ShapeNameSchema.optional(),
  fill: union([CssColorSchema, PaintSchema]).optional(),
  stroke: union([CssColorSchema, PaintSchema]).optional(),
  strokeWidth: number().nonnegative().optional(),
  fillOpacity: number().min(0).max(1).optional(),
  strokeOpacity: number().min(0).max(1).optional(),
  opacity: number().min(0).max(1).optional(),
  rotate: number().optional(),
  minimumSize: number().nonnegative().optional(),
}).describe('Ranged Dot endpoint constant Point appearance');

/** Ranged Dot connector 允许的常量 Path 表现 */
export const RangedDotRangePropertiesSchema = strictObject({
  stroke: union([CssColorSchema, PaintSchema]).optional(),
  strokeWidth: number().nonnegative().optional(),
  strokeOpacity: number().min(0).max(1).optional(),
  opacity: number().min(0).max(1).optional(),
  lineCap: PathLineCapSchema.optional(),
  lineJoin: PathLineJoinSchema.optional(),
  dashPattern: StrokeDashPatternSchema.optional(),
  shadow: union([zodEnum(ShadowPreset), DropShadowSchema]).optional(),
  blendMode: zodEnum(BlendMode).optional(),
}).describe('Ranged Dot connector constant Path appearance');

/** Ranged Dot authored mark member properties */
const RangedDotMarkPropertiesSchema = strictObject({
  point: RangedDotPointPropertiesSchema.optional(),
  startPoint: RangedDotPointPropertiesSchema.optional(),
  endPoint: RangedDotPointPropertiesSchema.optional(),
  range: RangedDotRangePropertiesSchema.optional(),
}).describe('Ranged Dot member appearance properties');

/** Ranged Dot recipe properties */
export const RangedDotChartPropertiesSchema = RangedDotMarkPropertiesSchema.extend({
  domainPadding: PointPositionDomainPaddingSchema.optional(),
}).describe('Ranged Dot recipe properties');

/** Ranged Dot authored mark 允许覆盖的直接字段 */
export const RangedDotMarkEncodingsSchema = strictObject({
  category: NonBlankStringSchema.optional(),
  start: NonBlankStringSchema.optional(),
  end: NonBlankStringSchema.optional(),
}).describe('Ranged Dot authored mark direct field overrides');

/** Ranged Dot authored mark payload */
export const RangedDotChartMarkSchema = strictObject({
  kind: literal(ChartType.RangedDot),
  override: boolean().optional(),
  encodings: RangedDotMarkEncodingsSchema.optional(),
  properties: RangedDotMarkPropertiesSchema.optional(),
}).describe('Ranged Dot Chart mark payload');

/** Ranged Dot recipe envelope */
export const RangedDotChartRecipeSchema = strictObject({
  chartType: literal(ChartType.RangedDot),
  encodings: RangedDotChartEncodingsSchema,
  properties: RangedDotChartPropertiesSchema.optional(),
  marks: array(RangedDotChartMarkSchema).optional(),
}).describe('Ranged Dot Chart recipe payload');

/** Ranged Dot recipe 稀疏主题 */
export const RangedDotChartThemeOverridesSchema = PointRecipeThemeOverridesSchema;

/** Ranged Dot recipe 完整主题 */
export const RangedDotChartThemeResolutionSchema = PointRecipeThemeResolutionSchema;

/** Ranged Dot exact Source schema */
export const RangedDotChartSchema = createChartSourceSchema(
  ChartFamily.Point,
  RangedDotChartRecipeSchema,
  createChartThemeSchema(RangedDotChartThemeOverridesSchema).optional(),
).describe('Ranged Dot Chart Source IR');

/** Ranged Dot exact Source IR */
export type IRRangedDotChart = ZodInfer<typeof RangedDotChartSchema>;

/** Ranged Dot recipe IR */
export type IRRangedDotChartRecipe = ZodInfer<typeof RangedDotChartRecipeSchema>;

/** Ranged Dot recipe 字段映射 */
export type IRRangedDotChartEncodings = ZodInfer<typeof RangedDotChartEncodingsSchema>;

/** Ranged Dot recipe 与 mark 共用的 member 属性 */
export type IRRangedDotChartProperties = ZodInfer<typeof RangedDotChartPropertiesSchema>;

/** Ranged Dot endpoint 常量属性 */
export type IRRangedDotPointProperties = ZodInfer<typeof RangedDotPointPropertiesSchema>;

/** Ranged Dot connector 常量属性 */
export type IRRangedDotRangeProperties = ZodInfer<typeof RangedDotRangePropertiesSchema>;

/** Ranged Dot authored mark IR */
export type IRRangedDotMark = ZodInfer<typeof RangedDotChartMarkSchema>;
