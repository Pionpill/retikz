import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { BuiltinShape } from './constants';
import type { ShapeNameSchema, ShapeRefSchema, ShapeValueSchema } from './schema';

/** Core 内置 shape 名联合 */
export type BuiltinShapeValue = ValueOf<typeof BuiltinShape>;

/** Core 内置 shape 或自定义注册名 */
export type ShapeName = z.infer<typeof ShapeNameSchema>;

/** shape 引用：type 名 + 可选 JSON params（编译期由注册的 shape 校验字段形态） */
export type IRShapeRef = z.infer<typeof ShapeRefSchema>;

/** Core shape 值：裸 shape 名或结构化 shape 引用 */
export type IRShapeValue = z.infer<typeof ShapeValueSchema>;
