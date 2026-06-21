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
    'TeX formula payload (a math run / `lowerTex` input): tex source + inline/display metrics mode; rendered to glyph paths via an injected lowerTex capability (@retikz/tex). Pure JSON; core does not depend on MathJax.',
  );

/** 公式降解载荷：tex 源 + 行/块级度量模式；编译期经注入 `lowerTex` 渲染成字形路径（`MathRun` / `LowerTex` 入参同型） */
export type IRTexContent = z.infer<typeof TexContentSchema>;
