import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

/** Cell presentation 引用 schema */
export const TablePresentationRefSchema = z
  .strictObject({
    name: z
      .string()
      .refine(name => name.trim().length > 0, 'Cell presentation provider name must contain non-whitespace characters.')
      .describe('Exact registered Cell presentation provider name. Whitespace is preserved.'),
    options: JsonObjectSchema.optional().describe('JSON options validated by the selected presentation provider.'),
  })
  .describe('Reference to a registered Cell presentation provider and its JSON options.');
