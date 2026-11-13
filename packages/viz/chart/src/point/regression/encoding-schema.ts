import { NonBlankStringSchema } from '@retikz/foundation';
import { OrdinalScaleSchema, PlotFacetOptionsSchema } from '@retikz/plot';
import { strictObject, union } from 'zod';

import {
  ChartPartitionEncodingSchema,
  createChartPositionEncodingSchema,
  refineChartFacetEncodings,
} from '../../_chart/schemas';
import { createChartDirectMappingSchema, createChartScaleBindingSchema } from '../../_chart/schemas/encoding';

/** Regression series 允许的 ordinal scale 绑定 */
export const RegressionSeriesScaleBindingSchema = createChartScaleBindingSchema(OrdinalScaleSchema).describe(
  'Regression series ordinal scale binding',
);

/** Regression x 位置字段映射 */
export const RegressionXEncodingSchema = createChartPositionEncodingSchema('x', 'Regression');

/** Regression y 位置字段映射 */
export const RegressionYEncodingSchema = createChartPositionEncodingSchema('y', 'Regression');

/** Regression recipe-only series 直接字段映射 */
export const RegressionSeriesEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(RegressionSeriesScaleBindingSchema),
]).describe('Regression recipe-only direct series field mapping');

/** Regression Chart 精确字段映射计划 */
export const RegressionChartEncodingsSchema = strictObject({
  x: RegressionXEncodingSchema,
  y: RegressionYEncodingSchema,
  series: RegressionSeriesEncodingSchema.optional(),
  row: ChartPartitionEncodingSchema.optional(),
  column: ChartPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => refineChartFacetEncodings(encodings, context, 'Regression'))
  .describe('Regression Chart exact field mapping plan');
