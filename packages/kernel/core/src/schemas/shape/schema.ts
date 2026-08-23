import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { JsonObjectSchema } from '../json';

export const ShapeRefSchema = z
  .strictObject({
    type: NonBlankStringSchema.describe(
      'Shape name; built-in or registered via CompileOptions.shapes. Unregistered names are rejected at compile time.',
    ),
    params: JsonObjectSchema.optional().describe(
      'JSON parameter object for parametric shapes. The registered shape validates its own parameter fields.',
    ),
  })
  .describe('Shape reference: type name + optional JSON params, validated at compile time by the registered shape.');

/** Core shape 值：裸 provider 名或带 JSON 参数的结构化引用 */
export const ShapeValueSchema = z
  .union([NonBlankStringSchema, ShapeRefSchema])
  .describe('Core shape value: a non-blank shape name or a structured shape reference.');
