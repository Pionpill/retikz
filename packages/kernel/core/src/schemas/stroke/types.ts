import type { z } from 'zod';

import type { StrokeDashPatternSchema, StrokeStyleSchema } from './schema';

/** 描边 dash / gap 长度序列 */
export type StrokeDashPattern = z.infer<typeof StrokeDashPatternSchema>;

/** 共享描边样式契约 */
export type IRStrokeStyle = z.infer<typeof StrokeStyleSchema>;
