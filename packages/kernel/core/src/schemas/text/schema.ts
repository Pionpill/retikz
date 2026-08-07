import { z } from 'zod';

import { FontSchema } from '../font';
import { CssColorSchema, OpacitySchema } from '../style';
import { NodeTextAlign } from './constants';

export const TextAlignSchema = z.enum(NodeTextAlign).describe('Text alignment within a multi-line text block.');

export const LineHeightSchema = z.number().positive().describe('Text line height in user units.');

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
    fill: CssColorSchema.optional().describe(
      'Glyph color for this formula segment; overrides the line / block text color.',
    ),
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

export const LabelTextContentSchema = z
  .union([z.string(), MixedLineSchema])
  .describe(
    'Label text content: a string (with `$...$` / `$$...$$` math sugar) or a `{ runs }` mixed text+math line. Single-line.',
  );

export const StyledLineSchema = z
  .object({
    text: z.string().describe('Line content'),
    fill: CssColorSchema.optional().describe('Per-line text color; overrides block default'),
    opacity: OpacitySchema.optional().describe('Per-line opacity.'),
    font: FontSchema.optional().describe('Per-line font overrides; missing fields inherit from block-level `font`'),
  })
  .describe('One styled text line with per-line visual overrides.');

type LabelVisualStyleDescriptionOverrides = Partial<Record<'textColor' | 'opacity' | 'font', string>>;

export const createLabelVisualStyleShape = (descriptions: LabelVisualStyleDescriptionOverrides = {}) => ({
  textColor: CssColorSchema.optional().describe(
    descriptions.textColor ?? 'Label text color override. Missing values inherit from host defaults.',
  ),
  opacity: OpacitySchema.optional().describe(
    descriptions.opacity ?? 'Label-only opacity. Host opacity may still multiply it at emit time.',
  ),
  font: FontSchema.optional().describe(
    descriptions.font ?? 'Label font overrides. Missing fields inherit from host defaults.',
  ),
});

export const LabelVisualStyleSchema = z
  .object(createLabelVisualStyleShape())
  .strict()
  .describe('Shared visual style fields for node labels and geometry labels.');

export const LineSpecSchema = z
  .union([z.string(), StyledLineSchema, MixedLineSchema])
  .describe(
    'Single line of text: bare string for default styling (with `$...$` math sugar), an object with per-line `fill` / `opacity` / `font` overrides, or a `{ runs }` mixed text+math line.',
  );

export const TextBlockSchema = z
  .union([z.string(), z.array(LineSpecSchema).min(1)])
  .describe(
    'Text block: a single string for one line, or a non-empty array of line specs (string for default, object for per-line overrides, `{ runs }` for mixed text+math).',
  );
