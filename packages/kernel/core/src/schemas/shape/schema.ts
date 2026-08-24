import { createOpenStringSchema } from '@retikz/foundation';
import { strictObject, union } from 'zod';

import { JsonObjectSchema } from '../json';
import { BuiltinShape } from './constants';

/** Core 内置 shape 与自定义注册名共享的开放名称 schema */
export const ShapeNameSchema = createOpenStringSchema(BuiltinShape).describe(
  'Shape name: a Core built-in or a custom name registered via CompileOptions.shapes.',
);

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
