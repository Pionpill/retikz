import { boolean, object, string } from 'zod';

/** 校验供公式转换能力消费的 LaTeX 源码与行内或块级度量模式 */
export const TexContentSchema = object({
  tex: string().describe('LaTeX source rendered to glyph paths by an injected lowerTex capability.'),
  displayMode: boolean().optional().describe('Display (block) vs inline TeX metrics; default inline (false).'),
}).describe('TeX formula payload for lowerTex: source plus inline/display metrics mode.');
