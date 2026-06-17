import { z } from 'zod';

export const MathContentSchema = z
  .object({
    tex: z
      .string()
      .describe('LaTeX math source rendered to glyph paths by an injected lowerMath capability.'),
    displayMode: z
      .boolean()
      .optional()
      .describe('Display (block) vs inline math metrics; default inline (false).'),
  })
  .describe(
    'Math formula as node content (parallel to text); rendered to glyph paths via an injected lowerMath capability (@retikz/tex). Pure JSON; core does not depend on MathJax.',
  );

/** 节点公式内容：tex 源 + 行/块级度量模式；编译期经注入 `lowerMath` 渲染成字形路径 */
export type IRMathContent = z.infer<typeof MathContentSchema>;
