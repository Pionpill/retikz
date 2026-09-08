import type { infer as ZodInfer } from 'zod';

import { NonBlankStringSchema } from '@retikz/foundation';
import { LayoutContainerBoxSchema, LayoutGapSchema } from '@retikz/layout';
import { PlotDefaultsSchema } from '@retikz/plot';
import { SurfaceBackgroundSchema } from '@retikz/standard';
import { strictObject } from 'zod';

import { ChartPresentationDefaultsSchema } from './presentation';

const ChartPaddingSchema = LayoutContainerBoxSchema.shape.padding.unwrap();

/** Chart 外部布局中允许从 defaults 提供的字段 */
export const ChartDefaultsLayoutSchema = strictObject({
  padding: ChartPaddingSchema.optional().describe('Chart content padding default'),
  gap: LayoutGapSchema.optional().describe('Chart presentation slot gap default'),
}).describe('Sparse Chart layout defaults without external dimensions');

/** Chart Source 的稀疏默认片段，字段路径与正式 Chart Source 对齐 */
export const ChartDefaultsSchema = strictObject({
  background: SurfaceBackgroundSchema.optional().describe('Default Chart surface background'),
  layout: ChartDefaultsLayoutSchema.optional().describe('Optional Chart layout defaults'),
  presentation: ChartPresentationDefaultsSchema.optional().describe('Optional Chart presentation defaults'),
}).describe('Sparse Chart defaults using formal Chart Source fields');

/** 注册 Chart Theme Definition 的严格声明 schema */
export const ChartThemeDefinitionSchema = strictObject({
  name: NonBlankStringSchema.describe('Registered Chart theme name'),
  base: NonBlankStringSchema.optional().describe('Optional registered base Chart theme name'),
  defaults: ChartDefaultsSchema.optional().describe('Sparse Chart Source defaults'),
  plotDefaults: PlotDefaultsSchema.optional().describe('Sparse Plot Source defaults forwarded to Plot'),
}).describe('Registered Chart theme Definition with Chart and Plot defaults');

/** Chart Source 的稀疏默认片段类型 */
export type IRChartDefaults = ZodInfer<typeof ChartDefaultsSchema>;

/** 注册 Chart Theme Definition 的 schema 派生类型 */
export type IRChartThemeDefinition = ZodInfer<typeof ChartThemeDefinitionSchema>;
