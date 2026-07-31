import type { z } from 'zod';

import type { StrokeDashPatternSchema } from './schema';

/** 描边 dash / gap 长度序列 */
export type StrokeDashPattern = z.infer<typeof StrokeDashPatternSchema>;
