import { z } from 'zod';

import type { JsonValue } from './types';

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z
    .union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonValueSchema), JsonObjectSchema])
    .describe('Recursive JSON value allowed in IR payloads: string, number, boolean, null, array, or object.'),
);

export const JsonObjectSchema = z
  .record(z.string(), JsonValueSchema)
  .describe('JSON object with string keys and recursive JSON values. Used for params and opaque metadata payloads.');
