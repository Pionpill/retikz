import { z } from 'zod';
import { FontSchema } from './font';

/**
 * 单行文本规格：纯字符串走块级默认，对象形式可覆盖 fill/opacity/font
 * @description 行级覆盖只生效于本行；font 子字段未填则继承块级；align/lineHeight 不可被行覆盖
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
        .describe('Per-line opacity 0..1'),
      font: FontSchema.optional().describe(
        'Per-line font overrides; missing fields inherit from block-level `font`',
      ),
    }),
  ])
  .describe(
    'Single line of text: bare string for default styling, or an object with per-line `fill` / `opacity` / `font` overrides.',
  );

/** 行规格 IR 类型 */
export type IRLineSpec = z.infer<typeof LineSpecSchema>;

/**
 * 文本块：单字符串或非空多行 LineSpec 数组
 * @description 选数组而非 `\n` 字符串：JSON 友好无 escape，行级覆盖天然落字段；通用文本结构，Node text / 未来 Step.label 等共用
 */
export const TextBlockSchema = z
  .union([z.string(), z.array(LineSpecSchema).min(1)])
  .describe(
    'Text block: a single string for one line, or a non-empty array of line specs (string for default, object for per-line overrides).',
  );

/** 文本块 IR 类型（单字符串或多行 LineSpec 数组） */
export type IRTextBlock = z.infer<typeof TextBlockSchema>;
