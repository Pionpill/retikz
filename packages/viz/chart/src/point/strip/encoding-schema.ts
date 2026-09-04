import { NonBlankStringSchema } from '@retikz/foundation';
import { strictObject, union } from 'zod';

import { createChartDirectMappingSchema } from '../../_chart/schemas/encoding';
import {
  PointColorScaleBindingSchema,
  PointOpacityScaleBindingSchema,
  PointPositionScaleBindingSchema,
  PointSizeScaleBindingSchema,
} from '../shared';

export const StripPositionScaleBindingSchema = PointPositionScaleBindingSchema.describe('Strip position scale binding');
export const StripColorScaleBindingSchema = PointColorScaleBindingSchema.describe('Strip color scale binding');
export const StripXEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(StripPositionScaleBindingSchema),
]).describe('Strip x direct field mapping');
export const StripYEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(StripPositionScaleBindingSchema),
]).describe('Strip y direct field mapping');
export const StripColorEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(StripColorScaleBindingSchema),
]).describe('Strip color direct field mapping');
export const StripSizeEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(PointSizeScaleBindingSchema),
]).describe('Strip size direct field mapping');
export const StripOpacityEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(PointOpacityScaleBindingSchema),
]).describe('Strip opacity direct field mapping');
export const StripShapeEncodingSchema = union([NonBlankStringSchema, createChartDirectMappingSchema()]).describe(
  'Strip shape direct field mapping',
);

export const StripChartEncodingsSchema = strictObject({
  x: StripXEncodingSchema,
  y: StripYEncodingSchema,
  color: StripColorEncodingSchema.optional(),
  size: StripSizeEncodingSchema.optional(),
  opacity: StripOpacityEncodingSchema.optional(),
  shape: StripShapeEncodingSchema.optional(),
}).describe('Strip Chart exact direct field mapping plan');
