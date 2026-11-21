import type { ValueOf } from '@retikz/foundation';
import { PositiveNumberSchema } from '@retikz/foundation';
import { enum as zodEnum, strictObject, string, boolean, array, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { OpacitySchema } from '../style/color';
import { ContextualColorSchema } from '../style/graphic';
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
  text: string(),
  fill: ContextualColorSchema.optional().describe(
    'Per-segment text color: an exact CSS color or a weight derived from the effective host text color.',
  ),
  opacity: OpacitySchema.optional(),
  font: FontSchema.optional().describe(
    'Per-segment font overrides; missing fields inherit from the line / block font.',
  ),
});

/** 校验与相邻文本共用基线的公式片段及其局部颜色和透明度 */
export const MathSegmentSchema = strictObject({
  fontSize: FontSizeSchema.optional().describe('Math font size; omitted values inherit the effective line font size.'),
  tex: string().describe('LaTeX source for this segment.'),
  displayMode: boolean()
    .optional()
    .describe(
      'Display (block) vs inline TeX metrics; default inline (false). The `$$...$$` sugar sets this true, `$...$` leaves it false.',
    ),
  fill: ContextualColorSchema.optional().describe(
    'Glyph color for this formula segment: an exact CSS color or a weight derived from the effective host text color.',
  ),
  opacity: OpacitySchema.optional(),
}).describe(
  'Inline math segment in a mixed line, baseline-aligned to surrounding text. Requires an injected lowerTex capability.',
);

/** 校验从左到右排列、共用基线的非空文本与公式片段序列 */
export const SegmentedLineSchema = strictObject({
  ...TextSegmentSchema.omit({ text: true }).shape,
  segments: array(union([TextSegmentSchema, MathSegmentSchema]))
    .min(1)
    .describe('Text and math segments laid out left-to-right on a shared baseline.'),
}).describe('Mixed line equivalent to inline math string syntax.');

/** 校验带有逐行颜色、透明度和字体覆盖的文本行 */
export const TextLineSchema = strictObject({
  text: string(),
  fill: ContextualColorSchema.optional().describe(
    'Per-line text color: an exact CSS color or a weight derived from the effective block text color.',
  ),
  opacity: OpacitySchema.optional(),
  font: FontSchema.optional().describe('Per-line font overrides; missing fields inherit from block-level `font`'),
});

/** 校验普通字符串、带样式文本行或文本与公式混排行 */
export const LineSchema = union([string(), TextLineSchema, SegmentedLineSchema]).describe(
  'String lines support inline math sugar.',
);

/** 校验单字符串文本块或非空文本行序列 */
export const TextBlockSchema = union([
  string().describe('Newlines are hard line breaks. Math in $...$ or $$...$$ requires lowerTex.'),
  array(LineSchema).min(1),
]);

/** 校验带正文元素的文本颜色及字体覆盖 */
export const TextVisualSchema = strictObject({
  textColor: ContextualColorSchema.optional().describe(
    'Node text color. A number derives from the effective node color; `contrast` selects black or white from the resolved static fill. Defaults to `currentColor`.',
  ),
  font: FontSchema.optional().describe('Font spec for the inner text label. Missing fields use text defaults.'),
});

/** 校验文本块对齐、行高与自动折行宽度约束 */
export const TextLayoutSchema = strictObject({
  textAlign: TextAlignSchema.optional().describe(
    'Multi-line text alignment within the text block. Omitted fields use middle.',
  ),
  lineHeight: LineHeightSchema.optional().describe(
    'Line height in user units; falls back to `font.size × 1.2` when omitted.',
  ),
  maxTextWidth: PositiveNumberSchema.optional().describe(
    'Maximum line width before wrapping, in user units. Omitted fields disable automatic wrapping.',
  ),
});

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
