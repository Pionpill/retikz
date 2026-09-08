import type { infer as ZodInfer } from 'zod';

import { array, literal, strictObject } from 'zod';

import { createChartSourceSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import {
  createPointChartMarkSchema,
  PointMarkEncodingSchema,
  PointPositionDomainPaddingSchema,
  PointPropertiesSchema,
  PointRecipeGuidesSchema,
} from '../shared';
import { ScatterChartEncodingsSchema } from './encoding-schema';

/** Scatter recipe 的精确 constant properties schema */
export const ScatterChartPropertiesSchema = PointPropertiesSchema.extend({
  domainPadding: PointPositionDomainPaddingSchema.optional(),
}).describe('Scatter Chart constant properties');

/** Scatter recipe 允许的有序 Chart mark schema */
export const ScatterChartMarkSchema = createPointChartMarkSchema(
  ChartType.Scatter,
  PointMarkEncodingSchema,
  PointPropertiesSchema,
).describe('Scatter Chart mark payload');

/** Scatter recipe 的严格 recipe envelope */
export const ScatterChartRecipeSchema = strictObject({
  chartType: literal(ChartType.Scatter).describe('Globally unique Scatter recipe key'),
  encodings: ScatterChartEncodingsSchema,
  properties: ScatterChartPropertiesSchema.optional(),
  guides: PointRecipeGuidesSchema.optional(),
  marks: array(ScatterChartMarkSchema).optional(),
}).describe('Scatter Chart recipe payload');

/** Scatter Chart 精确 Source schema */
export const ScatterChartSchema = createChartSourceSchema(ChartFamily.Point, ScatterChartRecipeSchema).describe(
  'Scatter Chart Source IR',
);

export type IRScatterChart = ZodInfer<typeof ScatterChartSchema>;
export type IRScatterChartRecipe = ZodInfer<typeof ScatterChartRecipeSchema>;
export type IRScatterChartEncodings = ZodInfer<typeof ScatterChartEncodingsSchema>;
export type IRScatterChartProperties = ZodInfer<typeof ScatterChartPropertiesSchema>;
