import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, object, strictObject, string, union } from 'zod';

import { FontSchema } from '../font';
import { AngleDegreesSchema } from '../scalar';
import { ContextualColorSchema, OpacitySchema } from '../style';
import { NodeTextAlign } from './constants';

export const TextAlignSchema = zodEnum(NodeTextAlign).describe('Text alignment within a multi-line text block.');

export const LineHeightSchema = PositiveNumberSchema.describe('Text line height in user units.');

export const TextRunSchema = object({
  text: string().describe('Text segment content within a mixed text+math line.'),
  fill: ContextualColorSchema.optional().describe(
    'Per-run text color: an exact CSS color or a weight derived from the effective host text color.',
  ),
  opacity: OpacitySchema.optional().describe('Per-run opacity.'),
  font: FontSchema.optional().describe('Per-run font overrides; missing fields inherit from the line / block font.'),
})
  .strict()
  .describe('A text segment in a mixed line (same fields as a line object).');

export const MathRunSchema = object({
  tex: string().describe(
    'LaTeX source for this inline formula segment, rendered to glyph paths by an injected lowerTex capability.',
  ),
  displayMode: boolean()
    .optional()
    .describe(
      'Display (block) vs inline TeX metrics; default inline (false). The `$$...$$` sugar sets this true, `$...$` leaves it false.',
    ),
  fill: ContextualColorSchema.optional().describe(
    'Glyph color for this formula segment: an exact CSS color or a weight derived from the effective host text color.',
  ),
  opacity: OpacitySchema.optional().describe('Per-run opacity.'),
})
  .strict()
  .describe(
    'Inline math segment in a mixed line, baseline-aligned to surrounding text. Requires an injected lowerTex capability.',
  );

export const MixedLineSchema = object({
  runs: array(union([TextRunSchema, MathRunSchema]))
    .min(1)
    .describe('Text and math segments laid out left-to-right on a shared baseline.'),
})
  .strict()
  .describe(
    'A line composed of text and math runs laid out left-to-right on a shared baseline (canonical form of the `$...$` string sugar).',
  );

export const LabelTextContentSchema = union([string(), MixedLineSchema]).describe(
  'Label text content: a string (with `$...$` / `$$...$$` math sugar) or a `{ runs }` mixed text+math line. Single-line.',
);

export const StyledLineSchema = object({
  text: string().describe('Line content'),
  fill: ContextualColorSchema.optional().describe(
    'Per-line text color: an exact CSS color or a weight derived from the effective block text color.',
  ),
  opacity: OpacitySchema.optional().describe('Per-line opacity.'),
  font: FontSchema.optional().describe('Per-line font overrides; missing fields inherit from block-level `font`'),
}).describe('One styled text line with per-line visual overrides.');

type LabelVisualStyleDescriptionOverrides = Partial<Record<'textColor' | 'opacity' | 'font', string>>;

export const createLabelVisualStyleShape = (descriptions: LabelVisualStyleDescriptionOverrides = {}) => ({
  textColor: ContextualColorSchema.optional().describe(
    descriptions.textColor ?? 'Label text color override. Missing values inherit from host defaults.',
  ),
  opacity: OpacitySchema.optional().describe(
    descriptions.opacity ?? 'Label-only opacity. Host opacity may still multiply it at emit time.',
  ),
  font: FontSchema.optional().describe(
    descriptions.font ?? 'Label font overrides. Missing fields inherit from host defaults.',
  ),
});

export const LabelVisualStyleSchema = object(createLabelVisualStyleShape())
  .strict()
  .describe('Shared visual style fields for node labels and geometry labels.');

export const LineSchema = union([string(), StyledLineSchema, MixedLineSchema]).describe(
  'Single line of text: bare string for default styling (with `$...$` math sugar), an object with per-line `fill` / `opacity` / `font` overrides, or a `{ runs }` mixed text+math line.',
);

export const TextBlockSchema = union([string(), array(LineSchema).min(1)]).describe(
  'Text block: a single string for one line, or a non-empty array of line specs (string for default, object for per-line overrides, `{ runs }` for mixed text+math).',
);

/** 宿主已提供边界锚点时的共享标签配置 */
export const BoundaryLabelSchema = strictObject({
  ...createLabelVisualStyleShape(),
  text: TextBlockSchema,
  align: TextAlignSchema.default('middle').describe('Alignment along the attachment tangent.'),
  placement: zodEnum(['outside', 'inside']).default('outside').describe('Side of the boundary support line.'),
  distance: NonNegativeNumberSchema.default(4).describe('Gap from the support line to the rotated label box.'),
  rotate: union([zodEnum(['none', 'radial', 'tangent']), AngleDegreesSchema])
    .default('none')
    .describe('Text rotation: none, outward radial, radial plus 90 degrees, or an explicit angle.'),
  keepUpright: boolean().default(false).describe('Flip upside-down text in host-local coordinates.'),
}).describe('Shared label attached to a host-provided boundary frame.');
