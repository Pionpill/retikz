import type { z } from 'zod';

import type { AxisGuideSchema, GuideSchema, LegendGuideSchema } from './schema';

/** guide（axis 或 legend） */
export type Guide = z.infer<typeof GuideSchema>;
/** 坐标轴 guide（轴线 + 刻度 + 标签 + 可选网格） */
export type AxisGuide = z.infer<typeof AxisGuideSchema>;
/** 图例 guide（swatch / 色带 ramp / 分箱 / 梯度符号，由绑定 scale 类型决定形态） */
export type LegendGuide = z.infer<typeof LegendGuideSchema>;
