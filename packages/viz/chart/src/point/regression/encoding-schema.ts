import { NonBlankStringSchema } from '@retikz/foundation';
import { OrdinalScaleSchema, PlotFacetOptionsSchema } from '@retikz/plot';
import { strictObject, union } from 'zod';

import { createChartDirectMappingSchema, createChartScaleBindingSchema } from '../../_chart/schemas/encoding';
import { createPointPositionEncodingSchema, PointPartitionEncodingSchema, refinePointFacetEncodings } from '../shared';

/** Regression series 允许的 ordinal scale 绑定 */
export const RegressionSeriesScaleBindingSchema = createChartScaleBindingSchema(OrdinalScaleSchema).describe(
  'Regression series ordinal scale binding',
);

/** Regression x 位置字段映射 */
export const RegressionXEncodingSchema = createPointPositionEncodingSchema('x', 'Regression');

/** Regression y 位置字段映射 */
export const RegressionYEncodingSchema = createPointPositionEncodingSchema('y', 'Regression');

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
  row: PointPartitionEncodingSchema.optional(),
  column: PointPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => refinePointFacetEncodings(encodings, context, 'Regression'))
  .describe('Regression Chart exact field mapping plan');
