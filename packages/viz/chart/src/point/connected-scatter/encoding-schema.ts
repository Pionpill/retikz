import { NonBlankStringSchema } from '@retikz/foundation';
import { OrdinalScaleSchema, PlotFacetOptionsSchema } from '@retikz/plot';
import { strictObject, union } from 'zod';

import { createChartDirectMappingSchema, createChartScaleBindingSchema } from '../../_chart/schemas/encoding';
import { createPointPositionEncodingSchema, PointPartitionEncodingSchema, refinePointFacetEncodings } from '../shared';

const SeriesScaleBindingSchema = createChartScaleBindingSchema(OrdinalScaleSchema);
const DirectFieldSchema = union([NonBlankStringSchema, createChartDirectMappingSchema()]);

/** Connected Scatter exact encoding plan */
export const ConnectedScatterChartEncodingsSchema = strictObject({
  x: createPointPositionEncodingSchema('x', 'Connected Scatter'),
  y: createPointPositionEncodingSchema('y', 'Connected Scatter'),
  order: DirectFieldSchema,
  series: union([NonBlankStringSchema, createChartDirectMappingSchema(SeriesScaleBindingSchema)]).optional(),
  row: PointPartitionEncodingSchema.optional(),
  column: PointPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => refinePointFacetEncodings(encodings, context, 'Connected Scatter'))
  .describe('Connected Scatter Chart exact field mapping plan');
