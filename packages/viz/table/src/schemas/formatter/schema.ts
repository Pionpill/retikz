import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

export const TableFormatterRefSchema = z
  .strictObject({
    name: z
      .string()
      .refine(name => name.trim().length > 0, 'Cell formatter provider name must contain non-whitespace characters.')
      .describe('Exact registered Cell formatter provider name. Whitespace is preserved.'),
    options: JsonObjectSchema.optional().describe('JSON options validated by the selected formatter provider.'),
  })
  .describe('Reference to a registered Cell formatter provider and its JSON options.');
