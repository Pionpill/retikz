import type { infer as ZodInfer } from 'zod';

import type {
  ScatterColorEncodingSchema,
  ScatterColorScaleBindingSchema,
  ScatterOpacityEncodingSchema,
  ScatterPositionScaleBindingSchema,
  ScatterShapeEncodingSchema,
  ScatterSizeEncodingSchema,
  ScatterXEncodingSchema,
  ScatterYEncodingSchema,
} from './encoding-schema';

export type IRScatterPositionScaleBinding = ZodInfer<typeof ScatterPositionScaleBindingSchema>;
export type IRScatterColorScaleBinding = ZodInfer<typeof ScatterColorScaleBindingSchema>;
export type IRScatterXEncoding = ZodInfer<typeof ScatterXEncodingSchema>;
export type IRScatterYEncoding = ZodInfer<typeof ScatterYEncodingSchema>;
export type IRScatterColorEncoding = ZodInfer<typeof ScatterColorEncodingSchema>;
export type IRScatterSizeEncoding = ZodInfer<typeof ScatterSizeEncodingSchema>;
export type IRScatterOpacityEncoding = ZodInfer<typeof ScatterOpacityEncodingSchema>;
export type IRScatterShapeEncoding = ZodInfer<typeof ScatterShapeEncodingSchema>;
