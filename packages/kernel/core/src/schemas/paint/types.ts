import type { z } from 'zod';
import type { GradientStopSchema, PaintSpecSchema } from './schema';

/** 渐变 stop 类型 */
export type IRGradientStop = z.infer<typeof GradientStopSchema>;

/** Paint server 规格类型（渐变 / 图案 / 图片） */
export type IRPaintSpec = z.infer<typeof PaintSpecSchema>;
