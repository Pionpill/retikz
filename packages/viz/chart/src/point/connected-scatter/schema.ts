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

export const ConnectedScatterChartMarkSchema = strictObject({
  kind: literal(ChartType.ConnectedScatter),
  override: boolean().optional(),
  encodings: ConnectedScatterMarkEncodingsSchema.optional(),
  properties: ConnectedScatterChartPropertiesSchema.optional(),
}).describe('Connected Scatter Chart mark payload');

export const ConnectedScatterChartRecipeSchema = strictObject({
  chartType: literal(ChartType.ConnectedScatter),
  encodings: ConnectedScatterChartEncodingsSchema,
  properties: ConnectedScatterChartPropertiesSchema.optional(),
  marks: array(ConnectedScatterChartMarkSchema).optional(),
}).describe('Connected Scatter Chart recipe payload');

export const ConnectedScatterChartThemeOverridesSchema = PointRecipeThemeOverridesSchema;
export const ConnectedScatterChartThemeResolutionSchema = PointRecipeThemeResolutionSchema;

export const ConnectedScatterChartSchema = createChartSourceSchema(
  ChartFamily.Point,
  ConnectedScatterChartRecipeSchema,
  createChartThemeSchema(ConnectedScatterChartThemeOverridesSchema).optional(),
).describe('Connected Scatter Chart Source IR');

export type IRConnectedScatterChart = ZodInfer<typeof ConnectedScatterChartSchema>;
export type IRConnectedScatterChartEncodings = ZodInfer<typeof ConnectedScatterChartEncodingsSchema>;
export type IRConnectedScatterPointProperties = ZodInfer<typeof ConnectedScatterPointPropertiesSchema>;
export type IRConnectedScatterPathProperties = ZodInfer<typeof ConnectedScatterPathPropertiesSchema>;
export type IRConnectedScatterChartProperties = ZodInfer<typeof ConnectedScatterChartPropertiesSchema>;
export type IRConnectedScatterMark = ZodInfer<typeof ConnectedScatterChartMarkSchema>;
