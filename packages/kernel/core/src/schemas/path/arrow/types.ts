import type { z } from 'zod';
import type { ArrowDetailSchema, ArrowEndDetailSchema } from './schema';

/** 端点级箭头视觉规格 */
export type IRArrowEndDetail = z.infer<typeof ArrowEndDetailSchema>;

/** Path 级箭头详细配置 */
export type IRArrowDetail = z.infer<typeof ArrowDetailSchema>;
