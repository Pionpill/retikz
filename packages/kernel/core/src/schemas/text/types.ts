import type { infer as ZodInfer } from 'zod';

import type {
  LabelTextContentSchema,
  LabelVisualStyleSchema,
  LineSchema,
  MathRunSchema,
  MixedLineSchema,
  TextBlockSchema,
  TextRunSchema,
} from './schema';

/** 混排文字段 IR 类型 */
export type IRTextRun = ZodInfer<typeof TextRunSchema>;

/** 混排公式段 IR 类型 */
export type IRMathRun = ZodInfer<typeof MathRunSchema>;

/** 混排行 IR 类型 */
export type IRMixedLine = ZodInfer<typeof MixedLineSchema>;

export type IRLabelTextContent = ZodInfer<typeof LabelTextContentSchema>;

export type IRLabelVisualStyle = ZodInfer<typeof LabelVisualStyleSchema>;

/** 行规格 IR 类型 */
export type IRLine = ZodInfer<typeof LineSchema>;

/** 文本块 IR 类型（单字符串或多行 IRLine 数组） */
export type IRTextBlock = ZodInfer<typeof TextBlockSchema>;
