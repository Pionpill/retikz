import { z } from 'zod';

/** 字体规格：family/size/weight/style 全部可选 */
export const FontSchema = z
  .object({
    family: z
      .string()
      .optional()
      .describe(
        'CSS font-family string such as "serif", "monospace", or "Inter, sans-serif".',
      ),
    size: z
      .number()
      .positive()

      .optional()
      .describe('Font size in user units. Omitted fields use inherited text defaults.'),
    weight: z
      .union([z.enum(['normal', 'bold']), z.number()])
      .optional()
      .describe('CSS font-weight: keyword `normal` / `bold` or numeric 100..900'),
    style: z
      .enum(['normal', 'italic', 'oblique'])
      .optional()
      .describe('CSS font-style'),
  })
  .describe(
    'Font properties shared by node text, labels, line specs, and scope defaults.',
  );
