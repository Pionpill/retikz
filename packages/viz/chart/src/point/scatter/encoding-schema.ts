import { PlotFacetOptionsSchema } from '@retikz/plot';
import { strictObject } from 'zod';

import {
  createPointPositionEncodingSchema,
  PointColorEncodingSchema,
  PointColorScaleBindingSchema,
  PointOpacityEncodingSchema,
  PointPartitionEncodingSchema,
  PointPositionScaleBindingSchema,
  PointShapeEncodingSchema,
  PointSizeEncodingSchema,
  refinePointFacetEncodings,
} from '../shared';

export const ScatterPositionScaleBindingSchema = PointPositionScaleBindingSchema.describe(
  'Scatter position scale binding',
);
export const ScatterColorScaleBindingSchema = PointColorScaleBindingSchema.describe('Scatter color scale binding');
export const ScatterXEncodingSchema = createPointPositionEncodingSchema('x', 'Scatter');
export const ScatterYEncodingSchema = createPointPositionEncodingSchema('y', 'Scatter');
export const ScatterColorEncodingSchema = PointColorEncodingSchema.describe('Scatter color field mapping');
export const ScatterSizeEncodingSchema = PointSizeEncodingSchema.describe('Scatter size field mapping');
export const ScatterOpacityEncodingSchema = PointOpacityEncodingSchema.describe('Scatter opacity field mapping');
export const ScatterShapeEncodingSchema = PointShapeEncodingSchema.describe('Scatter shape field mapping');

export const ScatterChartEncodingsSchema = strictObject({
  x: ScatterXEncodingSchema,
  y: ScatterYEncodingSchema,
  color: ScatterColorEncodingSchema.optional(),
  size: ScatterSizeEncodingSchema.optional(),
  opacity: ScatterOpacityEncodingSchema.optional(),
  shape: ScatterShapeEncodingSchema.optional(),
  row: PointPartitionEncodingSchema.optional(),
  column: PointPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => refinePointFacetEncodings(encodings, context, 'Scatter'))
  .describe('Scatter Chart exact field mapping plan');
