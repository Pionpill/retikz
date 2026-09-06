import type { infer as ZodInfer } from 'zod';

import type {
  CustomPositionAdjustmentSchema,
  JitterPositionAdjustmentSchema,
  JitterRatioSpanSchema,
  JitterSpanSchema,
  MarkPlacementSchema,
  PlotRandomDistributionSchema,
  PositionAdjustmentOperationSchema,
} from './schema';

/** 离散 step 比例 jitter 总宽 */
export type IRPlotJitterRatioSpan = ZodInfer<typeof JitterRatioSpanSchema>;

/** jitter 总宽 */
export type IRPlotJitterSpan = ZodInfer<typeof JitterSpanSchema>;

/** jitter 使用的内置随机分布 */
export type IRPlotRandomDistribution = ZodInfer<typeof PlotRandomDistributionSchema>;

/** 内置 jitter operation */
export type IRPlotJitterPositionAdjustment = ZodInfer<typeof JitterPositionAdjustmentSchema>;

/** 自定义 position adjustment operation */
export type IRPlotCustomPositionAdjustment = ZodInfer<typeof CustomPositionAdjustmentSchema>;

/** 内置或自定义 position adjustment operation */
export type IRPlotPositionAdjustmentOperation = ZodInfer<typeof PositionAdjustmentOperationSchema>;

/** Mark placement 配置 */
export type IRPlotMarkPlacement = ZodInfer<typeof MarkPlacementSchema>;
