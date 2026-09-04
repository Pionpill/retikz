import type { infer as ZodInfer } from 'zod';

import type {
  BubbleColorEncodingSchema,
  BubbleColorScaleBindingSchema,
  BubbleOpacityEncodingSchema,
  BubblePositionScaleBindingSchema,
  BubbleShapeEncodingSchema,
  BubbleSizeEncodingSchema,
  BubbleXEncodingSchema,
  BubbleYEncodingSchema,
} from './encoding-schema';

export type IRBubblePositionScaleBinding = ZodInfer<typeof BubblePositionScaleBindingSchema>;
export type IRBubbleColorScaleBinding = ZodInfer<typeof BubbleColorScaleBindingSchema>;
export type IRBubbleXEncoding = ZodInfer<typeof BubbleXEncodingSchema>;
export type IRBubbleYEncoding = ZodInfer<typeof BubbleYEncodingSchema>;
export type IRBubbleColorEncoding = ZodInfer<typeof BubbleColorEncodingSchema>;
export type IRBubbleSizeEncoding = ZodInfer<typeof BubbleSizeEncodingSchema>;
export type IRBubbleOpacityEncoding = ZodInfer<typeof BubbleOpacityEncodingSchema>;
export type IRBubbleShapeEncoding = ZodInfer<typeof BubbleShapeEncodingSchema>;
