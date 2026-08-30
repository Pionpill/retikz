import type { infer as ZodInfer } from 'zod';

import {
  BlendMode,
  CssColorSchema,
  DropShadowSchema,
  PathLineCapSchema,
  PathLineJoinSchema,
  ShadowPreset,
  StrokeDashPatternSchema,
} from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, number, strictObject, union } from 'zod';

import { createChartSourceSchema, createChartThemeSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import { PointPropertiesSchema, PointRecipeThemeOverridesSchema, PointRecipeThemeResolutionSchema } from '../shared';
import { ConnectedScatterChartEncodingsSchema } from './encoding-schema';

/** Connected Scatter Point member constants without layer ownership */
export const ConnectedScatterPointPropertiesSchema = PointPropertiesSchema.omit({ zIndex: true }).describe(
  'Connected Scatter Point constant properties without zIndex',
);

/** Connected Scatter Path member constants */
export const ConnectedScatterPathPropertiesSchema = strictObject({
  stroke: CssColorSchema.optional(),
  strokeWidth: number().nonnegative().optional(),
  strokeOpacity: number().min(0).max(1).optional(),
  opacity: number().min(0).max(1).optional(),
  lineCap: PathLineCapSchema.optional(),
  lineJoin: PathLineJoinSchema.optional(),
  dashPattern: StrokeDashPatternSchema.optional(),
  shadow: union([zodEnum(ShadowPreset), DropShadowSchema]).optional(),
  blendMode: zodEnum(BlendMode).optional(),
  connectNulls: boolean().optional(),
}).describe('Connected Scatter open Path constant properties');

/** Connected Scatter recipe properties */
export const ConnectedScatterChartPropertiesSchema = strictObject({
  point: ConnectedScatterPointPropertiesSchema.optional(),
  path: ConnectedScatterPathPropertiesSchema.optional(),
}).describe('Connected Scatter member properties');

/** Connected Scatter authored mark direct field overrides */
export const ConnectedScatterMarkEncodingsSchema = strictObject({
  x: NonBlankStringSchema.optional(),
  y: NonBlankStringSchema.optional(),
  order: NonBlankStringSchema.optional(),
}).describe('Connected Scatter authored mark direct encodings');

/** Connected Scatter authored mark payload */
export const ConnectedScatterChartMarkSchema = strictObject({
  kind: literal(ChartType.ConnectedScatter),
  override: boolean().optional(),
  encodings: ConnectedScatterMarkEncodingsSchema.optional(),
  properties: ConnectedScatterChartPropertiesSchema.optional(),
}).describe('Connected Scatter Chart mark payload');

/** Connected Scatter recipe envelope */
export const ConnectedScatterChartRecipeSchema = strictObject({
  chartType: literal(ChartType.ConnectedScatter),
  encodings: ConnectedScatterChartEncodingsSchema,
  properties: ConnectedScatterChartPropertiesSchema.optional(),
  marks: array(ConnectedScatterChartMarkSchema).optional(),
}).describe('Connected Scatter Chart recipe payload');

/** Connected Scatter recipe 稀疏主题 */
export const ConnectedScatterChartThemeOverridesSchema = PointRecipeThemeOverridesSchema;

/** Connected Scatter recipe 完整主题 */
export const ConnectedScatterChartThemeResolutionSchema = PointRecipeThemeResolutionSchema;

/** Connected Scatter exact Source schema */
export const ConnectedScatterChartSchema = createChartSourceSchema(
  ChartFamily.Point,
  ConnectedScatterChartRecipeSchema,
  createChartThemeSchema(ConnectedScatterChartThemeOverridesSchema).optional(),
).describe('Connected Scatter Chart Source IR');

/** Connected Scatter exact Source IR */
export type IRConnectedScatterChart = ZodInfer<typeof ConnectedScatterChartSchema>;

/** Connected Scatter recipe 字段映射 */
export type IRConnectedScatterChartEncodings = ZodInfer<typeof ConnectedScatterChartEncodingsSchema>;

/** Connected Scatter Point member 常量属性 */
export type IRConnectedScatterPointProperties = ZodInfer<typeof ConnectedScatterPointPropertiesSchema>;

/** Connected Scatter Path member 常量属性 */
export type IRConnectedScatterPathProperties = ZodInfer<typeof ConnectedScatterPathPropertiesSchema>;

/** Connected Scatter recipe 与 mark 共用的 member 属性 */
export type IRConnectedScatterChartProperties = ZodInfer<typeof ConnectedScatterChartPropertiesSchema>;

/** Connected Scatter authored mark IR */
export type IRConnectedScatterMark = ZodInfer<typeof ConnectedScatterChartMarkSchema>;
