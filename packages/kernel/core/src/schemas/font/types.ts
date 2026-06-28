import type { z } from 'zod';

import type { FontSchema } from './schema';

/** 字体规格 IR 类型（所有字段可选，编译期解析默认值） */
export type IRFont = z.infer<typeof FontSchema>;
