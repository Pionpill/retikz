import { z } from 'zod';
import { JsonObjectSchema } from '../json';

export const ShapeRefSchema = z
  .object({
    type: z
      .string()
      .min(1)
      .describe(
        'Shape name; built-in or registered via CompileOptions.shapes. Unregistered names are rejected at compile time.',
      ),
    params: JsonObjectSchema.optional().describe(
      'JSON parameter object for parametric shapes. The registered shape validates its own parameter fields.',
    ),
  })
  .describe(
    'Shape reference: type name + optional JSON params, validated at compile time by the registered shape.',
  );
