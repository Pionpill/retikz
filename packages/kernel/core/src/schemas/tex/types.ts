import type { z } from 'zod';

import type { TexContentSchema } from './schema';

/** 公式降解载荷：tex 源 + 行/块级度量模式；编译期经注入 `lowerTex` 渲染成字形路径（`MathRun` / `LowerTex` 入参同型） */
export type IRTexContent = z.infer<typeof TexContentSchema>;
