import { PlotFacetConfigurationSchema } from '@retikz/plot';
import type { infer as ZodInfer } from 'zod';

import { array, literal, strictObject } from 'zod';

import { createChartSourceSchema, createChartThemeSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import {
  PointEncodingSchema,
  PointMarkSchema,
  PointPropertiesSchema,
  PointRecipeThemeOverridesSchema,
  PointRecipeThemeResolutionSchema,
} from '../shared';

/** Scatter recipe 的精确 field-bound encoding schema */
export const ScatterChartEncodingsSchema = PointEncodingSchema.describe('Scatter Chart field-bound encodings');

/** Scatter recipe 的精确 constant properties schema */
export const ScatterChartPropertiesSchema = PointPropertiesSchema.describe('Scatter Chart constant properties');

/** Scatter recipe 允许的有序 Chart mark schema */
export const ScatterChartMarkSchema = strictObject(PointMarkSchema.shape).describe('Scatter Chart mark payload');

/** Scatter recipe 的严格 recipe envelope */
export const ScatterChartRecipeSchema = strictObject({
  chartType: literal(ChartType.Scatter).describe('Globally unique Scatter recipe key'),
  encodings: ScatterChartEncodingsSchema,
  properties: ScatterChartPropertiesSchema.optional(),
  facet: PlotFacetConfigurationSchema.optional(),
  marks: array(ScatterChartMarkSchema).optional(),
}).describe('Scatter Chart recipe payload');

/** Scatter recipe 的稀疏主题 schema */
export const ScatterChartThemeOverridesSchema = PointRecipeThemeOverridesSchema.describe(
  'Scatter Chart recipe theme overrides',
);

/** Scatter recipe 的完整主题 schema */
export const ScatterChartThemeResolutionSchema = PointRecipeThemeResolutionSchema.describe(
  'Scatter Chart recipe theme resolution',
);

/** Scatter Chart 精确 Source schema */
export const ScatterChartSchema = createChartSourceSchema(
  ChartFamily.Point,
  ScatterChartRecipeSchema,
  createChartThemeSchema(ScatterChartThemeOverridesSchema).optional(),
).describe('Scatter Chart Source IR');

export type IRScatterChart = ZodInfer<typeof ScatterChartSchema>;
export type IRScatterChartRecipe = ZodInfer<typeof ScatterChartRecipeSchema>;
export type IRScatterChartEncodings = ZodInfer<typeof ScatterChartEncodingsSchema>;
export type IRScatterChartProperties = ZodInfer<typeof ScatterChartPropertiesSchema>;
