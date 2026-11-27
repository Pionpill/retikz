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
  'Built-in shape or custom name registered via CompileOptions.shapes. Unknown names fail at compile time.',
);

/** 校验形状名称与 JSON 参数；具体参数约束由注册定义处理 */
export const ShapeRefSchema = strictObject({
  type: ShapeNameSchema,
  params: JsonObjectSchema.optional().describe('The selected shape validates these parameters at compile time.'),
});

/** Core shape 值：裸 provider 名或带 JSON 参数的结构化引用 */
export const ShapeValueSchema = union([ShapeNameSchema, ShapeRefSchema]);

/** shape 引用：type 名 + 可选 JSON params（编译期由注册的 shape 校验字段形态） */
export type IRShapeRef = ZodInfer<typeof ShapeRefSchema>;

/** Core shape 值：裸 shape 名或结构化 shape 引用 */
export type IRShapeValue = ZodInfer<typeof ShapeValueSchema>;
