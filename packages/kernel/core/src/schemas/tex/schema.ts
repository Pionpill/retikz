import { boolean, object, string } from 'zod';

export const TexContentSchema = object({
  tex: string().describe('LaTeX source rendered to glyph paths by an injected lowerTex capability.'),
  displayMode: boolean().optional().describe('Display (block) vs inline TeX metrics; default inline (false).'),
}).describe('TeX formula payload for lowerTex: source plus inline/display metrics mode.');
