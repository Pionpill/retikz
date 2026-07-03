import { z } from 'zod';

import { FontStyle, FontWeightKeyword } from './constants';

export const FontSchema = z
  .object({
    family: z
      .string()
      .optional()
      .describe('CSS font-family string such as "serif", "monospace", or "Inter, sans-serif".'),
    size: z
      .number()
      .positive()
      .optional()
      .describe('Font size in user units. Omitted fields use inherited text defaults.'),
    weight: z
      .union([z.enum(FontWeightKeyword), z.number()])
      .optional()
      .describe('CSS font-weight: keyword `normal` / `bold` or numeric 100..900'),
    style: z.enum(FontStyle).optional().describe('CSS font-style keyword.'),
  })
  .describe('Font properties shared by node text, labels, line specs, and scope defaults.');
