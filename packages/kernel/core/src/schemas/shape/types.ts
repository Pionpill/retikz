import type { z } from 'zod';

import type { ShapeRefSchema, ShapeValueSchema } from './schema';

/** shape 引用：type 名 + 可选 JSON params（编译期由注册的 shape 校验字段形态） */
export type IRShapeRef = z.infer<typeof ShapeRefSchema>;

/** Core shape 值：裸 shape 名或结构化 shape 引用 */
export type IRShapeValue = z.infer<typeof ShapeValueSchema>;
