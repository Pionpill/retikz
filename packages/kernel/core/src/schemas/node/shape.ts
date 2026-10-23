import type { ValueOf } from '@retikz/foundation';
import { createOpenStringSchema, JsonObjectSchema } from '@retikz/foundation';
import { strictObject, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

/** Core 内置 shape 名称 */
export const BuiltinShape = {
  Rectangle: 'rectangle',
  Circle: 'circle',
  Ellipse: 'ellipse',
  Diamond: 'diamond',
  Polygon: 'polygon',
} as const;

/** Core 内置 shape 名联合 */
export type BuiltinShape = ValueOf<typeof BuiltinShape>;

/** Core 内置 shape 与自定义注册名共享的开放名称 schema */
export const ShapeNameSchema = createOpenStringSchema(BuiltinShape).describe(
  'Shape name: a Core built-in or a custom name registered via CompileOptions.shapes.',
);

/** 校验形状名称与 JSON 参数；具体参数约束由注册定义处理 */
export const ShapeRefSchema = strictObject({
  type: ShapeNameSchema.describe(
    'Shape name; built-in or registered via CompileOptions.shapes. Unregistered names are rejected at compile time.',
  ),
  params: JsonObjectSchema.optional().describe(
    'JSON parameter object for parametric shapes. The registered shape validates its own parameter fields.',
  ),
}).describe('Shape reference: type name + optional JSON params, validated at compile time by the registered shape.');

/** Core shape 值：裸 provider 名或带 JSON 参数的结构化引用 */
export const ShapeValueSchema = union([ShapeNameSchema, ShapeRefSchema]).describe(
  'Core shape value: a non-blank shape name or a structured shape reference.',
);

/** shape 引用：type 名 + 可选 JSON params（编译期由注册的 shape 校验字段形态） */
export type IRShapeRef = ZodInfer<typeof ShapeRefSchema>;

/** Core shape 值：裸 shape 名或结构化 shape 引用 */
export type IRShapeValue = ZodInfer<typeof ShapeValueSchema>;
