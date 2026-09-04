import type { infer as ZodInfer } from 'zod';

import type {
  RangedDotCategoryEncodingSchema,
  RangedDotColorEncodingSchema,
  RangedDotEndEncodingSchema,
  RangedDotStartEncodingSchema,
} from './encoding-schema';

/** Ranged Dot category 字段映射 */
export type IRRangedDotCategoryEncoding = ZodInfer<typeof RangedDotCategoryEncodingSchema>;

/** Ranged Dot start 字段映射 */
export type IRRangedDotStartEncoding = ZodInfer<typeof RangedDotStartEncodingSchema>;

/** Ranged Dot end 字段映射 */
export type IRRangedDotEndEncoding = ZodInfer<typeof RangedDotEndEncodingSchema>;

/** Ranged Dot 共享颜色字段映射 */
export type IRRangedDotColorEncoding = ZodInfer<typeof RangedDotColorEncodingSchema>;
