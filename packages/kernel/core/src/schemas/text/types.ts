import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type {
  BoundaryLabelSchema,
  LabelTextContentSchema,
  LabelVisualStyleSchema,
  LineSchema,
  MathSegmentSchema,
  SegmentedLineSchema,
  TextBlockSchema,
  TextSegmentSchema,
  TextVisualSchema,
  TextLayoutSchema,
} from './schema';

/** 混排文字段 IR 类型 */
export type IRTextSegment = ZodInfer<typeof TextSegmentSchema>;

/** 混排公式段 IR 类型 */
export type IRMathSegment = ZodInfer<typeof MathSegmentSchema>;

/** 混排行 IR 类型 */
export type IRSegmentedLine = ZodInfer<typeof SegmentedLineSchema>;

export type IRLabelTextContent = ZodInfer<typeof LabelTextContentSchema>;

export type IRLabelVisualStyle = ZodInfer<typeof LabelVisualStyleSchema>;

/** 行规格 IR 类型 */
export type IRLine = ZodInfer<typeof LineSchema>;

/** 文本块 IR 类型（单字符串或多行 IRLine 数组） */
export type IRTextBlock = ZodInfer<typeof TextBlockSchema>;

export type IRBoundaryLabel = ZodInput<typeof BoundaryLabelSchema>;

export type IRTextVisual = ZodInfer<typeof TextVisualSchema>;

export type IRTextLayout = ZodInfer<typeof TextLayoutSchema>;
