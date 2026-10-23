import type { ValueOf } from '@retikz/foundation';
import { PositiveNumberSchema } from '@retikz/foundation';
import { enum as zodEnum, strictObject, string, boolean, array, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { ContextualColorSchema, OpacitySchema } from '../style/graphic';
import { FontSchema, FontSizeSchema } from './font';

/** 节点与多行文本共享的文字对齐关键字 */
export const NodeTextAlign = {
  Start: 'start',
  Middle: 'middle',
  End: 'end',
} as const;

export type NodeTextAlign = ValueOf<typeof NodeTextAlign>;

/** 校验多行文本块内的横向对齐方式 */
export const TextAlignSchema = zodEnum(NodeTextAlign).describe('Text alignment within a multi-line text block.');

/** 校验用户单位下的正数行高 */
export const LineHeightSchema = PositiveNumberSchema.describe('Text line height in user units.');

/** 校验混排行中的纯文本片段及其局部视觉覆盖 */
export const TextSegmentSchema = strictObject({
  text: string().describe('Text segment content within a mixed text+math line.'),
  fill: ContextualColorSchema.optional().describe(
    'Per-segment text color: an exact CSS color or a weight derived from the effective host text color.',
  ),
  opacity: OpacitySchema.optional().describe('Per-segment opacity.'),
  font: FontSchema.optional().describe(
    'Per-segment font overrides; missing fields inherit from the line / block font.',
  ),
}).describe('A text segment in a mixed line (same fields as a line object).');

/** 校验与相邻文本共用基线的公式片段及其局部颜色和透明度 */
export const MathSegmentSchema = strictObject({
  fontSize: FontSizeSchema.optional().describe('Math font size; omitted values inherit the effective line font size.'),
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
  opacity: OpacitySchema.optional().describe('Per-segment opacity.'),
}).describe(
  'Inline math segment in a mixed line, baseline-aligned to surrounding text. Requires an injected lowerTex capability.',
);

/** 校验从左到右排列、共用基线的非空文本与公式片段序列 */
export const SegmentedLineSchema = strictObject({
  ...TextSegmentSchema.omit({ text: true }).shape,
  segments: array(union([TextSegmentSchema, MathSegmentSchema]))
    .min(1)
    .describe('Text and math segments laid out left-to-right on a shared baseline.'),
}).describe(
  'A line composed of text and math segments laid out left-to-right on a shared baseline (canonical form of the `$...$` string sugar).',
);

/** 校验带有逐行颜色、透明度和字体覆盖的文本行 */
export const TextLineSchema = strictObject({
  text: string().describe('Line content'),
  fill: ContextualColorSchema.optional().describe(
    'Per-line text color: an exact CSS color or a weight derived from the effective block text color.',
  ),
  opacity: OpacitySchema.optional().describe('Per-line opacity.'),
  font: FontSchema.optional().describe('Per-line font overrides; missing fields inherit from block-level `font`'),
}).describe('One styled text line with per-line visual overrides.');

/** 校验普通字符串、带样式文本行或文本与公式混排行 */
export const LineSchema = union([string(), TextLineSchema, SegmentedLineSchema]).describe(
  'Single line of text: bare string for default styling (with `$...$` math sugar), an object with per-line `fill` / `opacity` / `font` overrides, or a `{ segments }` mixed text+math line.',
);

/** 校验单字符串文本块或非空文本行序列 */
export const TextBlockSchema = union([string(), array(LineSchema).min(1)]).describe(
  'Text block: a single string for one line, or a non-empty array of line specs (string for default, object for per-line overrides, `{ segments }` for mixed text+math).',
);

/** 校验带正文元素的文本颜色及字体覆盖 */
export const TextVisualSchema = strictObject({
  textColor: ContextualColorSchema.optional().describe(
    'Node text color. A number derives from the effective node color; `contrast` selects black or white from the resolved static fill. Defaults to `currentColor`.',
  ),
  font: FontSchema.optional().describe('Font spec for the inner text label. Missing fields use text defaults.'),
}).describe('Text color and font for a primary text-bearing element.');

/** 校验文本块对齐、行高与自动折行宽度约束 */
export const TextLayoutSchema = strictObject({
  align: TextAlignSchema.optional().describe(
    'Multi-line text alignment within the text block. Omitted fields use middle.',
  ),
  lineHeight: LineHeightSchema.optional().describe(
    'Line height in user units; falls back to `font.size × 1.2` when omitted.',
  ),
  maxTextWidth: PositiveNumberSchema.optional().describe(
    'Maximum line width before wrapping, in user units. Omitted fields disable automatic wrapping.',
  ),
}).describe('Text block alignment, line height, and wrapping width.');

/** 混排文字段 IR 类型 */
export type IRTextSegment = ZodInfer<typeof TextSegmentSchema>;

/** 混排公式段 IR 类型 */
export type IRMathSegment = ZodInfer<typeof MathSegmentSchema>;

/** 混排行 IR 类型 */
export type IRSegmentedLine = ZodInfer<typeof SegmentedLineSchema>;

/** 行规格 IR 类型 */
export type IRLine = ZodInfer<typeof LineSchema>;

/** 文本块 IR 类型（单字符串或多行 IRLine 数组） */
export type IRTextBlock = ZodInfer<typeof TextBlockSchema>;
