import type { infer as ZodInfer } from 'zod';

import type {
  StripColorEncodingSchema,
  StripColorScaleBindingSchema,
  StripOpacityEncodingSchema,
  StripPositionScaleBindingSchema,
  StripShapeEncodingSchema,
  StripSizeEncodingSchema,
  StripXEncodingSchema,
  StripYEncodingSchema,
} from './encoding-schema';

export type IRStripPositionScaleBinding = ZodInfer<typeof StripPositionScaleBindingSchema>;
export type IRStripColorScaleBinding = ZodInfer<typeof StripColorScaleBindingSchema>;
export type IRStripXEncoding = ZodInfer<typeof StripXEncodingSchema>;
export type IRStripYEncoding = ZodInfer<typeof StripYEncodingSchema>;
export type IRStripColorEncoding = ZodInfer<typeof StripColorEncodingSchema>;
export type IRStripSizeEncoding = ZodInfer<typeof StripSizeEncodingSchema>;
export type IRStripOpacityEncoding = ZodInfer<typeof StripOpacityEncodingSchema>;
export type IRStripShapeEncoding = ZodInfer<typeof StripShapeEncodingSchema>;
