import { NonNegativeNumberSchema } from '@retikz/foundation';
import { strictObject } from 'zod';
export const BoxPaddingSchema = strictObject({
  top: NonNegativeNumberSchema.optional().describe('Top padding in user units'),
  right: NonNegativeNumberSchema.optional().describe('Right padding in user units'),
  bottom: NonNegativeNumberSchema.optional().describe('Bottom padding in user units'),
  left: NonNegativeNumberSchema.optional().describe('Left padding in user units'),
}).describe('Optional per-side padding around a plot composition frame');
