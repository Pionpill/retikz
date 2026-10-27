import { object, string, boolean } from 'zod';
import type { infer as ZodInfer } from 'zod';

/** 校验供公式转换能力消费的 LaTeX 源码与行内或块级度量模式 */
export const TexContentSchema = object({
  tex: string().describe('LaTeX source rendered to glyph paths by an injected lowerTex capability.'),
  displayMode: boolean().optional().describe('Display (block) vs inline TeX metrics; default inline (false).'),
}).describe('TeX formula payload for lowerTex: source plus inline/display metrics mode.');

/** 公式降解载荷：tex 源 + 行/块级度量模式；编译期经注入 `lowerTex` 渲染成字形路径（`MathSegment` / `TexLowerer` 入参同型） */
export type IRTexContent = ZodInfer<typeof TexContentSchema>;
