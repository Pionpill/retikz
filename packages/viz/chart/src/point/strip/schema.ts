import type { infer as ZodInfer } from 'zod';

import { JitterPositionAdjustmentSchema } from '@retikz/plot';
import { array, literal, strictObject } from 'zod';

import { createChartSourceSchema, createChartThemeSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import {
  createPointChartMarkSchema,
  PointMarkEncodingSchema,
  PointPositionDomainPaddingSchema,
  PointPropertiesSchema,
  PointRecipeThemeOverridesSchema,
  PointRecipeThemeResolutionSchema,
} from '../shared';
import { StripChartEncodingsSchema } from './encoding-schema';

/** Strip jitter shorthand，不允许作者指定由 Plot 自动选择的 role */
export const StripChartJitterSchema = JitterPositionAdjustmentSchema.omit({ kind: true, role: true }).describe(
  'Strip deterministic jitter shorthand without an authored coordinate role',
);

/** Strip recipe 的精确 constant properties schema */
export const StripChartPropertiesSchema = PointPropertiesSchema.extend({
  jitter: StripChartJitterSchema.optional(),
  domainPadding: PointPositionDomainPaddingSchema.optional(),
}).describe('Strip Chart constant properties');

/** Strip authored mark 的精确 constant properties schema */
export const StripChartMarkPropertiesSchema = PointPropertiesSchema.extend({
  jitter: StripChartJitterSchema.optional(),
}).describe('Strip Chart mark constant properties');

/** Strip recipe 允许的有序 Chart mark schema */
export const StripChartMarkSchema = createPointChartMarkSchema(
  ChartType.Strip,
  PointMarkEncodingSchema,
  StripChartMarkPropertiesSchema,
).describe('Strip Chart mark payload');

/** Strip recipe 的严格 recipe envelope */
export const StripChartRecipeSchema = strictObject({
  chartType: literal(ChartType.Strip).describe('Globally unique Strip recipe key'),
  encodings: StripChartEncodingsSchema,
  properties: StripChartPropertiesSchema.optional(),
  marks: array(StripChartMarkSchema).optional(),
}).describe('Strip Chart recipe payload');

/** Strip recipe 的稀疏主题 schema */
export const StripChartThemeOverridesSchema = PointRecipeThemeOverridesSchema.describe(
  'Strip Chart recipe theme overrides',
);

/** Strip recipe 的完整主题 schema */
export const StripChartThemeResolutionSchema = PointRecipeThemeResolutionSchema.describe(
  'Strip Chart recipe theme resolution',
);

/** Strip Chart 精确 Source schema */
export const StripChartSchema = createChartSourceSchema(
  ChartFamily.Point,
  StripChartRecipeSchema,
  createChartThemeSchema(StripChartThemeOverridesSchema).optional(),
).describe('Strip Chart Source IR');

export type IRStripChart = ZodInfer<typeof StripChartSchema>;
export type IRStripChartRecipe = ZodInfer<typeof StripChartRecipeSchema>;
export type IRStripChartEncodings = ZodInfer<typeof StripChartEncodingsSchema>;
export type IRStripChartProperties = ZodInfer<typeof StripChartPropertiesSchema>;
export type IRStripChartJitter = ZodInfer<typeof StripChartJitterSchema>;
export type IRStripChartMarkProperties = ZodInfer<typeof StripChartMarkPropertiesSchema>;
