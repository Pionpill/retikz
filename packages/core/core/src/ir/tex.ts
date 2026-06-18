import { z } from 'zod';

export const TexContentSchema = z
  .object({
    tex: z
      .string()
      .describe('LaTeX source rendered to glyph paths by an injected lowerTex capability.'),
    displayMode: z
      .boolean()
      .optional()
      .describe('Display (block) vs inline TeX metrics; default inline (false).'),
  })
  .describe(
    'TeX formula as node content (parallel to text); rendered to glyph paths via an injected lowerTex capability (@retikz/tex). Pure JSON; core does not depend on MathJax.',
  );

/** 节点公式内容：tex 源 + 行/块级度量模式；编译期经注入 `lowerTex` 渲染成字形路径 */
export type IRTexContent = z.infer<typeof TexContentSchema>;
