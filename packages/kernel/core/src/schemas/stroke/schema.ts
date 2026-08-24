import { NonNegativeNumberSchema } from '@retikz/foundation';
import { array, enum as zodEnum, number, strictObject } from 'zod';

import { PathLineCap, PathLineJoin } from './constants';

export const StrokeDashPatternSchema = array(NonNegativeNumberSchema)
  .min(1)
  .describe('Stroke dash pattern lengths in user units.');

export const StrokeDashOffsetSchema = number().describe(
  'Stroke dash offset in user units. Positive and negative finite values are allowed.',
);

export const PathLineCapSchema = zodEnum(PathLineCap).describe('Path stroke endpoint cap keyword.');

export const PathLineJoinSchema = zodEnum(PathLineJoin).describe('Path stroke corner join keyword.');

export const StrokeWidthSchema = NonNegativeNumberSchema.describe('Stroke width in user units.');

export const StrokeStyleSchema = strictObject({
  strokeWidth: StrokeWidthSchema.optional().describe('Stroke width in user units.'),
  dashPattern: StrokeDashPatternSchema.optional().describe(
    'Stroke dash pattern lengths in user units. Omitted fields mean solid line.',
  ),
  dashOffset: StrokeDashOffsetSchema.optional().describe(
    'Stroke dash offset in user units. Positive and negative finite values are allowed.',
  ),
}).describe('Shared stroke style fields for drawable geometry.');
