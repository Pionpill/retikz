import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, object, strictObject, string, union } from 'zod';

import { FontSchema } from '../font';
import { AngleDegreesSchema } from '../scalar';
import { ContextualColorSchema, OpacitySchema } from '../style';
import { NodeTextAlign } from './constants';

/** 校验多行文本块内的横向对齐方式 */
export const TextAlignSchema = zodEnum(NodeTextAlign).describe('Text alignment within a multi-line text block.');

/** 校验用户单位下的正数行高 */
export const LineHeightSchema = PositiveNumberSchema.describe('Text line height in user units.');

/** 校验混排行中的纯文本片段及其局部视觉覆盖 */
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

/** 校验与相邻文本共用基线的公式片段及其局部颜色和透明度 */
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

/** 校验从左到右排列、共用基线的非空文本与公式片段序列 */
export const MixedLineSchema = object({
  runs: array(union([TextRunSchema, MathRunSchema]))
    .min(1)
    .describe('Text and math segments laid out left-to-right on a shared baseline.'),
})
  .strict()
  .describe(
    'A line composed of text and math runs laid out left-to-right on a shared baseline (canonical form of the `$...$` string sugar).',
  );

/** 校验单行标签内容，接受文本语法糖或显式混排片段 */
export const LabelTextContentSchema = union([string(), MixedLineSchema]).describe(
  'Label text content: a string (with `$...$` / `$$...$$` math sugar) or a `{ runs }` mixed text+math line. Single-line.',
);

/** 校验带有逐行颜色、透明度和字体覆盖的文本行 */
export const StyledLineSchema = object({
  text: string().describe('Line content'),
  fill: ContextualColorSchema.optional().describe(
    'Per-line text color: an exact CSS color or a weight derived from the effective block text color.',
  ),
  opacity: OpacitySchema.optional().describe('Per-line opacity.'),
  font: FontSchema.optional().describe('Per-line font overrides; missing fields inherit from block-level `font`'),
}).describe('One styled text line with per-line visual overrides.');

type LabelVisualStyleDescriptionOverrides = Partial<Record<'textColor' | 'opacity' | 'font', string>>;

/** 创建标签共用的视觉字段校验器，并允许调用方覆盖字段的英文契约描述 */
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

/** 校验节点标签与几何标签共用的颜色、透明度及字体覆盖 */
export const LabelVisualStyleSchema = object(createLabelVisualStyleShape())
  .strict()
  .describe('Shared visual style fields for node labels and geometry labels.');

/** 校验普通字符串、带样式文本行或文本与公式混排行 */
export const LineSchema = union([string(), StyledLineSchema, MixedLineSchema]).describe(
  'Single line of text: bare string for default styling (with `$...$` math sugar), an object with per-line `fill` / `opacity` / `font` overrides, or a `{ runs }` mixed text+math line.',
);

/** 校验单字符串文本块或非空文本行序列 */
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
