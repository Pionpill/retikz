import { JsonObjectSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

export const TablePresentationRefSchema = z
  .strictObject({
    name: z
      .string()
      .refine(name => NonBlankStringSchema.safeParse(name).success, {
        message: 'Cell presentation provider name must contain non-whitespace characters.',
      })
      .describe('Exact registered Cell presentation provider name. Whitespace is preserved.'),
    options: JsonObjectSchema.optional().describe('JSON options validated by the selected presentation provider.'),
  })
  .describe('Reference to a registered Cell presentation provider and its JSON options.');
