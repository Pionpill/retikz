import type { z } from 'zod';

import type {
  ChartPresentationAuthoringRecordSchema,
  ChartPresentationFlexItemSchema,
  ChartPresentationItemSchema,
  ChartPresentationPlotItemSchema,
  ChartPresentationSchema,
} from './schema';

/** Chart presentation 复用的 Layout Flex item 字段 */
export type ChartPresentationFlexItem = z.infer<typeof ChartPresentationFlexItemSchema>;

/** framework-neutral Chart presentation authoring record */
export type ChartPresentationAuthoringRecord = z.infer<typeof ChartPresentationAuthoringRecordSchema>;

/** canonical Chart Plot placeholder */
export type IRChartPresentationPlotItem = z.infer<typeof ChartPresentationPlotItemSchema>;

/** canonical Chart presentation item */
export type IRChartPresentationItem = z.infer<typeof ChartPresentationItemSchema>;

/** canonical authored-order Chart presentation */
export type IRChartPresentation = z.infer<typeof ChartPresentationSchema>;

/** Chart presentation shorthand */
export type ChartPresentationShorthand = {
  title?: string;
  subtitle?: string;
  note?: string;
  source?: string;
};
