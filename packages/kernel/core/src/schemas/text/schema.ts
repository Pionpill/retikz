import { z } from 'zod';
import { FontSchema } from '../font';

/**
 * 混排行内的文字段
 * @description 与 line 对象同字段集（含 opacity）；放进 `MixedLineSchema.runs` 与公式段左右共基线排布
 */
export const TextRunSchema = z
  .object({
    text: z.string().describe('Text segment content within a mixed text+math line.'),
    fill: z
      .string()
      .optional()
      .describe('Per-run text color; overrides the line / block default.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Per-run opacity.'),
    font: FontSchema.optional().describe(
      'Per-run font overrides; missing fields inherit from the line / block font.',
    ),
  })
  .strict()
  .describe('A text segment in a mixed line (same fields as a line object).');

/**
 * 混排行内的公式段
 * @description 载荷同节点公式内容（tex + 度量模式）；编译期经注入 `lowerTex` 渲染成字形路径、按 depth 贴文字基线。`$...$` 糖产 inline（displayMode 缺省 false）、`$$...$$` 糖产 display
 */
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
    fill: z
      .string()
      .optional()
      .describe('Glyph color for this formula segment; overrides the line / block text color.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Per-run opacity.'),
  })
  .strict()
  .describe(
    'Inline math segment in a mixed line, baseline-aligned to surrounding text. Requires an injected lowerTex capability.',
  );

/**
 * 混排行：文字段 + 公式段交替的 run 序列
 * @description 一行由 text run / math run 左→右共基线排布；canonical 形态（与 `$...$` 字符串糖等价，糖在编译期解析）。空 runs 由 schema 拒
 */
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

/**
 * 单行文本规格：纯字符串走块级默认，对象形式可覆盖 fill/opacity/font，或 run 序列做 text+math 混排
 * @description 行级覆盖只生效于本行；font 子字段未填则继承块级；align/lineHeight 不可被行覆盖。
 *   纯字符串里的 `$...$` / `$$...$$` 在编译期（注入 lowerTex 时）解析成 run 序列；未注入则字面渲染
 */
export const LineSpecSchema = z
  .union([
    z.string(),
    z.object({
      text: z.string().describe('Line content'),
      fill: z
        .string()
        .optional()
        .describe('Per-line text color; overrides block default'),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Per-line opacity.'),
      font: FontSchema.optional().describe(
        'Per-line font overrides; missing fields inherit from block-level `font`',
      ),
    }),
    MixedLineSchema,
  ])
  .describe(
    'Single line of text: bare string for default styling (with `$...$` math sugar), an object with per-line `fill` / `opacity` / `font` overrides, or a `{ runs }` mixed text+math line.',
  );

/**
 * 文本块：单字符串或非空多行 LineSpec 数组
 * @description 选数组而非 `\n` 字符串：JSON 友好无 escape，行级覆盖天然落字段；通用文本结构，Node text / Node label / Step.label 等共用。任意字符串行可含 `$...$` 行内公式糖
 */
export const TextBlockSchema = z
  .union([z.string(), z.array(LineSpecSchema).min(1)])
  .describe(
    'Text block: a single string for one line, or a non-empty array of line specs (string for default, object for per-line overrides, `{ runs }` for mixed text+math).',
  );
