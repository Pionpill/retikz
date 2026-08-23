import { TextBlockSchema } from '@retikz/core';
import { z } from 'zod';

/** Chart 固定 presentation slot 的输入结构 */
export const ChartPresentationSchema = z
  .strictObject({
    title: TextBlockSchema.optional().describe('Optional title slot'),
    subtitle: TextBlockSchema.optional().describe('Optional subtitle slot'),
    note: TextBlockSchema.optional().describe('Optional note slot'),
    source: TextBlockSchema.optional().describe('Optional source slot'),
  })
  .describe('Fixed Chart presentation slots resolved in title, subtitle, plot, note, source order');

/** Chart presentation 的 IR 类型 */
export type IRChartPresentation = z.infer<typeof ChartPresentationSchema>;
