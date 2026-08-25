import type { ZodType } from 'zod';

import { array, boolean, lazy, null as zodNull, number, record, string, union } from 'zod';

import type { JsonValue } from './types';

export const JsonValueSchema: ZodType<JsonValue> = lazy(() =>
  union([string(), number(), boolean(), zodNull(), array(JsonValueSchema), JsonObjectSchema]).describe(
    'Recursive JSON value allowed in IR payloads: string, number, boolean, null, array, or object.',
  ),
);

export const JsonObjectSchema = record(string(), JsonValueSchema).describe(
  'JSON object with string keys and recursive JSON values. Used for params and opaque metadata payloads.',
);
