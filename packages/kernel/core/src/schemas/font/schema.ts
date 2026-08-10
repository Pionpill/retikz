import { PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { FontStyle, FontWeightKeyword, WebFontSizePreset } from './constants';

const RelativeFontSizeSchema = z
  .string()
  .regex(/^(?:\d+(?:\.\d+)?|\.\d+)(?:em|rem)$/)
  .refine(value => Number.parseFloat(value) > 0)
  .describe('Relative font size with `em` or `rem`, resolved during compile.');

export const FontSizeSchema = z
  .union([PositiveNumberSchema, z.enum(WebFontSizePreset), RelativeFontSizeSchema])
  .describe('Font size as user units, web preset, or relative `em` / `rem` value.');

export const FontFamilySchema = z
  .string()
  .describe('CSS font-family string such as "serif", "monospace", or "Inter, sans-serif".');

export const FontWeightSchema = z
  .union([z.enum(FontWeightKeyword), z.number()])
  .describe('CSS font-weight keyword or numeric value.');

export const FontStyleSchema = z.enum(FontStyle).describe('CSS font-style keyword.');

export const FontSchema = z
  .object({
    family: FontFamilySchema.optional().describe(
      'CSS font-family string such as "serif", "monospace", or "Inter, sans-serif".',
    ),
    size: z
      .lazy(() => FontSizeSchema)
      .optional()
      .describe('Font size in user units, presets, or relative units. Omitted fields use inherited text defaults.'),
    weight: FontWeightSchema.optional().describe('CSS font-weight: keyword `normal` / `bold` or numeric value.'),
    style: FontStyleSchema.optional().describe('CSS font-style keyword.'),
  })
  .describe('Font properties shared by node text, labels, line specs, and scope defaults.');
