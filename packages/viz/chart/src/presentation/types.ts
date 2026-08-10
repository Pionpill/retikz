import type { z } from 'zod';

import type {
  ChartPresentationChildContentSchema,
  ChartPresentationChildItemSchema,
  ChartPresentationItemContentSchema,
  ChartPresentationItemSchema,
  ChartPresentationLayoutSchema,
  ChartPresentationPlotContentSchema,
  ChartPresentationPlotItemSchema,
  ChartPresentationPresetContentSchema,
  ChartPresentationPresetItemSchema,
  ChartPresentationSchema,
  ChartPresentationStyledTextSchema,
  ChartPresentationTextBlockSchema,
  ChartPresentationTextSchema,
} from './schema';

/** non-empty Chart presentation TextBlock */
export type IRChartPresentationTextBlock = z.infer<typeof ChartPresentationTextBlockSchema>;

/** 带 preset-local wrapper style 的 Chart presentation text */
export type IRChartPresentationStyledText = z.infer<typeof ChartPresentationStyledTextSchema>;

/** Chart presentation preset 的 shorthand 或 styled text */
export type IRChartPresentationText = z.infer<typeof ChartPresentationTextSchema>;

/** Chart presentation 的 sparse Layout Flex container 覆盖 */
export type IRChartPresentationLayout = z.infer<typeof ChartPresentationLayoutSchema>;

/** Chart presentation Plot content */
export type IRChartPresentationPlotContent = z.infer<typeof ChartPresentationPlotContentSchema>;

/** Chart presentation preset content */
export type IRChartPresentationPresetContent = z.infer<typeof ChartPresentationPresetContentSchema>;

/** Chart presentation custom child content */
export type IRChartPresentationChildContent = z.infer<typeof ChartPresentationChildContentSchema>;

/** Chart presentation item content union */
export type IRChartPresentationItemContent = z.infer<typeof ChartPresentationItemContentSchema>;

/** Chart presentation Plot item */
export type IRChartPresentationPlotItem = z.infer<typeof ChartPresentationPlotItemSchema>;

/** Chart presentation preset item */
export type IRChartPresentationPresetItem = z.infer<typeof ChartPresentationPresetItemSchema>;

/** Chart presentation custom child item */
export type IRChartPresentationChildItem = z.infer<typeof ChartPresentationChildItemSchema>;

/** Chart presentation item union */
export type IRChartPresentationItem = z.infer<typeof ChartPresentationItemSchema>;

/** authored-order Chart presentation */
export type IRChartPresentation = z.infer<typeof ChartPresentationSchema>;
