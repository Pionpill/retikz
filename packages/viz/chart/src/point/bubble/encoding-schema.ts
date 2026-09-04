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

export const BubblePositionScaleBindingSchema = PointPositionScaleBindingSchema.describe(
  'Bubble position scale binding',
);
export const BubbleColorScaleBindingSchema = PointColorScaleBindingSchema.describe('Bubble color scale binding');
export const BubbleXEncodingSchema = createPointPositionEncodingSchema('x', 'Bubble');
export const BubbleYEncodingSchema = createPointPositionEncodingSchema('y', 'Bubble');
export const BubbleColorEncodingSchema = PointColorEncodingSchema.describe('Bubble color field mapping');
export const BubbleSizeEncodingSchema = PointSizeEncodingSchema.describe('Bubble size field mapping');
export const BubbleOpacityEncodingSchema = PointOpacityEncodingSchema.describe('Bubble opacity field mapping');
export const BubbleShapeEncodingSchema = PointShapeEncodingSchema.describe('Bubble shape field mapping');

/** Bubble Chart 精确字段映射计划 */
export const BubbleChartEncodingsSchema = strictObject({
  x: BubbleXEncodingSchema,
  y: BubbleYEncodingSchema,
  size: BubbleSizeEncodingSchema,
  color: BubbleColorEncodingSchema.optional(),
  opacity: BubbleOpacityEncodingSchema.optional(),
  shape: BubbleShapeEncodingSchema.optional(),
  row: PointPartitionEncodingSchema.optional(),
  column: PointPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => refinePointFacetEncodings(encodings, context, 'Bubble'))
  .describe('Bubble Chart exact field mapping plan');
