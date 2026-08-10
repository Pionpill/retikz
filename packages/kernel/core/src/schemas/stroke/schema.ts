import { NonNegativeNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { PathLineCap, PathLineJoin } from './constants';

export const StrokeDashPatternSchema = z
  .array(NonNegativeNumberSchema)
  .min(1)
  .describe('Stroke dash pattern lengths in user units.');

export const StrokeDashOffsetSchema = z
  .number()
  .describe('Stroke dash offset in user units. Positive and negative finite values are allowed.');

export const PathLineCapSchema = z.enum(PathLineCap).describe('Path stroke endpoint cap keyword.');

export const PathLineJoinSchema = z.enum(PathLineJoin).describe('Path stroke corner join keyword.');

export const StrokeWidthSchema = NonNegativeNumberSchema.describe('Stroke width in user units.');

export const StrokeStyleSchema = z
  .strictObject({
    strokeWidth: StrokeWidthSchema.optional().describe('Stroke width in user units.'),
    dashPattern: StrokeDashPatternSchema.optional().describe(
      'Stroke dash pattern lengths in user units. Omitted fields mean solid line.',
    ),
    dashOffset: StrokeDashOffsetSchema.optional().describe(
      'Stroke dash offset in user units. Positive and negative finite values are allowed.',
    ),
  })
  .describe('Shared stroke style fields for drawable geometry.');
