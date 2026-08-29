import type { infer as ZodInfer } from 'zod';

import { array, literal, strictObject } from 'zod';

import { createChartSourceSchema, createChartThemeSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import {
  createPointChartMarkSchema,
  PointMarkEncodingWithoutSizeSchema,
  PointPropertiesWithoutSizeSchema,
  PointRecipeThemeOverridesSchema,
  PointRecipeThemeResolutionSchema,
} from '../shared';
import { BubbleChartEncodingsSchema } from './encoding-schema';

/** Bubble recipe 的精确 constant properties schema */
export const BubbleChartPropertiesSchema = PointPropertiesWithoutSizeSchema.describe(
  'Bubble Chart constant properties without size',
);

/** Bubble recipe 允许的有序 Chart mark schema */
export const BubbleChartMarkSchema = createPointChartMarkSchema(
  ChartType.Bubble,
  PointMarkEncodingWithoutSizeSchema,
  BubbleChartPropertiesSchema,
).describe('Bubble Chart mark payload');

/** Bubble recipe 的严格 recipe envelope */
export const BubbleChartRecipeSchema = strictObject({
  chartType: literal(ChartType.Bubble).describe('Globally unique Bubble recipe key'),
  encodings: BubbleChartEncodingsSchema,
  properties: BubbleChartPropertiesSchema.optional(),
  marks: array(BubbleChartMarkSchema).optional(),
}).describe('Bubble Chart recipe payload');

/** Bubble recipe 的稀疏主题 schema */
export const BubbleChartThemeOverridesSchema = PointRecipeThemeOverridesSchema.describe(
  'Bubble Chart recipe theme overrides',
);

/** Bubble recipe 的完整主题 schema */
export const BubbleChartThemeResolutionSchema = PointRecipeThemeResolutionSchema.describe(
  'Bubble Chart recipe theme resolution',
);

/** Bubble Chart 精确 Source schema */
export const BubbleChartSchema = createChartSourceSchema(
  ChartFamily.Point,
  BubbleChartRecipeSchema,
  createChartThemeSchema(BubbleChartThemeOverridesSchema).optional(),
).describe('Bubble Chart Source IR');

export type IRBubbleChart = ZodInfer<typeof BubbleChartSchema>;
export type IRBubbleChartRecipe = ZodInfer<typeof BubbleChartRecipeSchema>;
export type IRBubbleChartEncodings = ZodInfer<typeof BubbleChartEncodingsSchema>;
export type IRBubbleChartProperties = ZodInfer<typeof BubbleChartPropertiesSchema>;
