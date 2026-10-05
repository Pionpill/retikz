import { PositiveNumberSchema } from '@retikz/foundation';
import { enum as zodEnum, lazy, number, object, string, union } from 'zod';

import { FontStyle, FontWeightKeyword, WebFontSizePreset } from './constants';

const RelativeFontSizeSchema = string()
  .regex(/^(?:\d+(?:\.\d+)?|\.\d+)(?:em|rem)$/)
  .refine(value => Number.parseFloat(value) > 0)
  .describe('Relative font size with `em` or `rem`, resolved during compile.');

/** 校验用户单位字号、Web 预设或 em 与 rem 相对字号 */
export const FontSizeSchema = union([
  PositiveNumberSchema,
  zodEnum(WebFontSizePreset),
  RelativeFontSizeSchema,
]).describe('Font size as user units, web preset, or relative `em` / `rem` value.');

/** 校验供文本使用的 CSS 字体族字符串 */
export const FontFamilySchema = string().describe(
  'CSS font-family string such as "serif", "monospace", or "Inter, sans-serif".',
);

/** 校验字重关键字或数值字重 */
export const FontWeightSchema = union([zodEnum(FontWeightKeyword), number()]).describe(
  'CSS font-weight keyword or numeric value.',
);

/** 校验 CSS 字形关键字 */
export const FontStyleSchema = zodEnum(FontStyle).describe('CSS font-style keyword.');

/** 校验正文、标签和作用域默认样式共用的字体覆盖字段 */
export const FontSchema = object({
  family: FontFamilySchema.optional().describe(
    'CSS font-family string such as "serif", "monospace", or "Inter, sans-serif".',
  ),
  size: lazy(() => FontSizeSchema)
    .optional()
    .describe('Font size in user units, presets, or relative units. Omitted fields use inherited text defaults.'),
  weight: FontWeightSchema.optional().describe('CSS font-weight: keyword `normal` / `bold` or numeric value.'),
  style: FontStyleSchema.optional().describe('CSS font-style keyword.'),
}).describe('Font properties shared by node text, labels, line specs, and scope defaults.');
