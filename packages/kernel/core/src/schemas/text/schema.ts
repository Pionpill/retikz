import { z } from 'zod';

import { FontSchema } from '../font';
import { CssColorSchema, OpacitySchema } from '../style';

export const TextRunSchema = z
  .object({
    text: z.string().describe('Text segment content within a mixed text+math line.'),
    fill: CssColorSchema.optional().describe('Per-run text color; overrides the line / block default.'),
    opacity: OpacitySchema.optional().describe('Per-run opacity.'),
    font: FontSchema.optional().describe('Per-run font overrides; missing fields inherit from the line / block font.'),
  })
  .strict()
  .describe('A text segment in a mixed line (same fields as a line object).');

export const MathRunSchema = z
  .object({
    tex: z
      .string()
      .describe(
        'LaTeX source for this inline formula segment, rendered to glyph paths by an injected lowerTex capability.',
      ),
    displayMode: z
      .boolean()
      .optional()
      .describe(
        'Display (block) vs inline TeX metrics; default inline (false). The `$$...$$` sugar sets this true, `$...$` leaves it false.',
      ),
    fill: CssColorSchema.optional().describe('Glyph color for this formula segment; overrides the line / block text color.'),
    opacity: OpacitySchema.optional().describe('Per-run opacity.'),
  })
  .strict()
  .describe(
    'Inline math segment in a mixed line, baseline-aligned to surrounding text. Requires an injected lowerTex capability.',
  );

export const MixedLineSchema = z
  .object({
    runs: z
      .array(z.union([TextRunSchema, MathRunSchema]))
      .min(1)
      .describe('Text and math segments laid out left-to-right on a shared baseline.'),
  })
  .strict()
  .describe(
    'A line composed of text and math runs laid out left-to-right on a shared baseline (canonical form of the `$...$` string sugar).',
  );

export const LineSpecSchema = z
  .union([
    z.string(),
    z.object({
      text: z.string().describe('Line content'),
      fill: CssColorSchema.optional().describe('Per-line text color; overrides block default'),
      opacity: OpacitySchema.optional().describe('Per-line opacity.'),
      font: FontSchema.optional().describe('Per-line font overrides; missing fields inherit from block-level `font`'),
    }),
    MixedLineSchema,
  ])
  .describe(
    'Single line of text: bare string for default styling (with `$...$` math sugar), an object with per-line `fill` / `opacity` / `font` overrides, or a `{ runs }` mixed text+math line.',
  );

export const TextBlockSchema = z
  .union([z.string(), z.array(LineSpecSchema).min(1)])
  .describe(
    'Text block: a single string for one line, or a non-empty array of line specs (string for default, object for per-line overrides, `{ runs }` for mixed text+math).',
  );
