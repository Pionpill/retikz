import type { z } from 'zod';
import type { ShapeRefSchema } from './schema';

/** shape 引用：type 名 + 可选 JSON params（编译期由注册的 shape 校验字段形态） */
export type IRShapeRef = z.infer<typeof ShapeRefSchema>;
