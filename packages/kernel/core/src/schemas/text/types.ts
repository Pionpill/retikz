import type { z } from 'zod';
import type { LineSpecSchema, MathRunSchema, MixedLineSchema, TextBlockSchema, TextRunSchema } from './schema';

/** 混排文字段 IR 类型 */
export type IRTextRun = z.infer<typeof TextRunSchema>;

/** 混排公式段 IR 类型 */
export type IRMathRun = z.infer<typeof MathRunSchema>;

/** 混排行 IR 类型 */
export type IRMixedLine = z.infer<typeof MixedLineSchema>;

/** 行规格 IR 类型 */
export type IRLineSpec = z.infer<typeof LineSpecSchema>;

/** 文本块 IR 类型（单字符串或多行 LineSpec 数组） */
export type IRTextBlock = z.infer<typeof TextBlockSchema>;
