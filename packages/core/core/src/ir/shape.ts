import { z } from 'zod';
import { JsonObjectSchema } from './json';

export const ShapeRefSchema = z
  .object({
    type: z
      .string()
      .min(1)
      .describe(
        'Shape name; built-in or registered via CompileOptions.shapes. Unregistered names are rejected at compile time.',
      ),
    params: JsonObjectSchema.optional().describe(
      'JSON-only parameter object for parametric shapes (e.g. sector { innerRadius, outerRadius, startAngle, endAngle }). Must be a plain JSON object (validated by JsonObjectSchema); the registered shape validates its own field shape via paramsSchema. Omitted for parameterless shapes.',
    ),
  })
  .describe(
    'Shape reference: type name + optional JSON params, validated at compile time by the registered shape.',
  );

/** shape 引用：type 名 + 可选 JSON params（编译期由注册的 shape 校验字段形态） */
export type IRShapeRef = z.infer<typeof ShapeRefSchema>;
