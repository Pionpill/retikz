import type { z } from 'zod';

import type {
  ChartPresentationFlexItemSchema,
  ChartPresentationItemSchema,
  ChartPresentationPlotItemSchema,
  ChartPresentationSchema,
} from './schema';

/** Chart 展示复用的 Layout Flex 展示项字段 */
export type ChartPresentationFlexItem = z.infer<typeof ChartPresentationFlexItemSchema>;

/** 确定形态的 Chart Plot 占位项 */
export type IRChartPresentationPlotItem = z.infer<typeof ChartPresentationPlotItemSchema>;

/** 确定形态的 Chart 展示项 */
export type IRChartPresentationItem = z.infer<typeof ChartPresentationItemSchema>;

/** 按编写顺序确定的 Chart 展示结构 */
export type IRChartPresentation = z.infer<typeof ChartPresentationSchema>;
