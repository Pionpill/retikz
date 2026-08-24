import type { infer as ZodInfer } from 'zod';

import type { StrokeDashPatternSchema, StrokeStyleSchema } from './schema';

/** 描边 dash / gap 长度序列 */
export type StrokeDashPattern = ZodInfer<typeof StrokeDashPatternSchema>;

/** 共享描边样式契约 */
export type IRStrokeStyle = ZodInfer<typeof StrokeStyleSchema>;
