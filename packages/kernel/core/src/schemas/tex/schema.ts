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
