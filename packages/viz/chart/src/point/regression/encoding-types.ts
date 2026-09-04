import type { infer as ZodInfer } from 'zod';

import type {
  RegressionSeriesEncodingSchema,
  RegressionSeriesScaleBindingSchema,
  RegressionXEncodingSchema,
  RegressionYEncodingSchema,
} from './encoding-schema';

/** Regression series ordinal scale 绑定 */
export type IRRegressionSeriesScaleBinding = ZodInfer<typeof RegressionSeriesScaleBindingSchema>;

/** Regression x 字段映射 */
export type IRRegressionXEncoding = ZodInfer<typeof RegressionXEncodingSchema>;

/** Regression y 字段映射 */
export type IRRegressionYEncoding = ZodInfer<typeof RegressionYEncodingSchema>;

/** Regression recipe-only series 字段映射 */
export type IRRegressionSeriesEncoding = ZodInfer<typeof RegressionSeriesEncodingSchema>;
