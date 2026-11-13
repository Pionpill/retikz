import { NonBlankStringSchema } from '@retikz/foundation';
import { OrdinalScaleSchema, PlotFacetOptionsSchema } from '@retikz/plot';
import { strictObject, union } from 'zod';

import {
  createChartPositionEncodingSchema,
  ChartPartitionEncodingSchema,
  refineChartFacetEncodings,
} from '../../_chart/schemas';
import { createChartDirectMappingSchema, createChartScaleBindingSchema } from '../../_chart/schemas/encoding';

const SeriesScaleBindingSchema = createChartScaleBindingSchema(OrdinalScaleSchema);

const DirectFieldSchema = union([NonBlankStringSchema, createChartDirectMappingSchema()]);

/** 连接散点图的精确编码计划 */
export const LineChartEncodingsSchema = strictObject({
  x: createChartPositionEncodingSchema('x', 'Line'),
  y: createChartPositionEncodingSchema('y', 'Line'),
  order: DirectFieldSchema.optional(),
  series: union([NonBlankStringSchema, createChartDirectMappingSchema(SeriesScaleBindingSchema)]).optional(),
  row: ChartPartitionEncodingSchema.optional(),
  column: ChartPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => refineChartFacetEncodings(encodings, context, 'Line'))
  .describe('Line Chart exact field mapping plan');
