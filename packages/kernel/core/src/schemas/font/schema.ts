import { PositiveNumberSchema } from '@retikz/foundation';
import { enum as zodEnum, lazy, number, object, string, union } from 'zod';

import { FontStyle, FontWeightKeyword, WebFontSizePreset } from './constants';

const RelativeFontSizeSchema = string()
  .regex(/^(?:\d+(?:\.\d+)?|\.\d+)(?:em|rem)$/)
  .refine(value => Number.parseFloat(value) > 0)
  .describe('Relative font size with `em` or `rem`, resolved during compile.');

export const FontSizeSchema = union([
  PositiveNumberSchema,
  zodEnum(WebFontSizePreset),
  RelativeFontSizeSchema,
]).describe('Font size as user units, web preset, or relative `em` / `rem` value.');

export const FontFamilySchema = string().describe(
  'CSS font-family string such as "serif", "monospace", or "Inter, sans-serif".',
);

export const FontWeightSchema = union([zodEnum(FontWeightKeyword), number()]).describe(
  'CSS font-weight keyword or numeric value.',
);

export const FontStyleSchema = zodEnum(FontStyle).describe('CSS font-style keyword.');

export const FontSchema = object({
  family: FontFamilySchema.optional().describe(
    'CSS font-family string such as "serif", "monospace", or "Inter, sans-serif".',
  ),
  size: lazy(() => FontSizeSchema)
    .optional()
    .describe('Font size in user units, presets, or relative units. Omitted fields use inherited text defaults.'),
  weight: FontWeightSchema.optional().describe('CSS font-weight: keyword `normal` / `bold` or numeric value.'),
  style: FontStyleSchema.optional().describe('CSS font-style keyword.'),
}).describe('Font properties shared by node text, labels, line specs, and scope defaults.');
