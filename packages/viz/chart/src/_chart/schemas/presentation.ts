import type { infer as ZodInfer } from 'zod';

import { NodeLayoutSchema, NodeStyleSchema, TextBlockSchema } from '@retikz/core';
import { strictObject } from 'zod';

/** Chart presentation 区域的视觉覆盖字段 */
export const ChartPresentationStyleSchema = NodeStyleSchema.pick({
  textColor: true,
  font: true,
  opacity: true,
}).describe('Chart presentation text style overrides');

/** Chart presentation 区域的文本布局覆盖字段 */
export const ChartPresentationLayoutSchema = NodeLayoutSchema.pick({
  align: true,
  lineHeight: true,
  maxTextWidth: true,
}).describe('Chart presentation text layout overrides');

/** Chart presentation 区域的正式 Source 片段 */
export const ChartPresentationRegionSchema = strictObject({
  text: TextBlockSchema.describe('Presentation text content'),
  style: ChartPresentationStyleSchema.optional().describe('Direct visual style for this existing presentation region'),
  layout: ChartPresentationLayoutSchema.optional().describe('Direct layout for this existing presentation region'),
}).describe('One existing Chart presentation region');

/** Chart presentation 区域的稀疏默认片段 */
export const ChartPresentationRegionDefaultsSchema = strictObject({
  style: ChartPresentationStyleSchema.optional().describe('Default visual style for an existing presentation region'),
  layout: ChartPresentationLayoutSchema.optional().describe('Default layout for an existing presentation region'),
}).describe('Sparse defaults for an existing Chart presentation region');

/** Chart 固定 presentation slot 的输入结构 */
export const ChartPresentationSchema = strictObject({
  title: ChartPresentationRegionSchema.optional().describe('Optional title slot'),
  subtitle: ChartPresentationRegionSchema.optional().describe('Optional subtitle slot'),
  note: ChartPresentationRegionSchema.optional().describe('Optional note slot'),
  source: ChartPresentationRegionSchema.optional().describe('Optional source slot'),
}).describe('Fixed Chart presentation slots resolved in title, subtitle, plot, note, source order');

/** Chart 固定 presentation slot 的稀疏默认片段 */
export const ChartPresentationDefaultsSchema = strictObject({
  title: ChartPresentationRegionDefaultsSchema.optional().describe('Title defaults applied only when title exists'),
  subtitle: ChartPresentationRegionDefaultsSchema.optional().describe(
    'Subtitle defaults applied only when subtitle exists',
  ),
  note: ChartPresentationRegionDefaultsSchema.optional().describe('Note defaults applied only when note exists'),
  source: ChartPresentationRegionDefaultsSchema.optional().describe('Source defaults applied only when source exists'),
}).describe('Sparse defaults for existing Chart presentation slots');

/** Chart presentation 的 IR 类型 */
export type IRChartPresentation = ZodInfer<typeof ChartPresentationSchema>;
/** Chart presentation 单个正式区域的 IR 类型 */
export type IRChartPresentationRegion = ZodInfer<typeof ChartPresentationRegionSchema>;
/** Chart presentation 稀疏默认片段的 IR 类型 */
export type IRChartPresentationDefaults = ZodInfer<typeof ChartPresentationDefaultsSchema>;
