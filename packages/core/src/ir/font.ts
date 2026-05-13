import { z } from 'zod';

/** 字体规格：family/size/weight/style 全部可选 */
export const FontSchema = z
  .object({
    family: z
      .string()
      .optional()
      .describe(
        'CSS font-family string, e.g. "serif", "monospace", "Inter, sans-serif"',
      ),
    size: z
      .number()
      .positive()
      .finite()
      .optional()
      .describe('Font size in user units; falls back to the renderer default when omitted'),
    weight: z
      .union([z.enum(['normal', 'bold']), z.number().finite()])
      .optional()
      .describe('CSS font-weight: keyword `normal` / `bold` or numeric 100..900'),
    style: z
      .enum(['normal', 'italic', 'oblique'])
      .optional()
      .describe('CSS font-style'),
  })
  .describe(
    'Font properties (family / size / weight / style). All fields optional; consumed by Node text / Node label / LineSpec / future Tikz / Scope font defaults.',
  );

/** 字体规格 IR 类型（所有字段可选，编译期解析默认值） */
export type IRFont = z.infer<typeof FontSchema>;
