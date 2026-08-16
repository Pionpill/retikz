import { PlotSchema } from '@retikz/plot';
import { z } from 'zod';

import { ChartPresentationSchema } from '../presentation';
import { ChartThemeTokenOverridesSchema } from '../style';

export const ChartCommonFieldShape = {
  id: z.string().min(1).optional().describe('Optional stable Chart identity and outer scope id'),
  chartThemeTokens: ChartThemeTokenOverridesSchema.optional().describe('Sparse Chart-owned theme token overrides'),
  presentation: ChartPresentationSchema.optional().describe('Optional canonical presentation around the Plot'),
} as const;

export const ChartPlotSchema = z
  .strictObject({
    data: PlotSchema.shape.data,
    transform: PlotSchema.shape.transform,
    scales: PlotSchema.shape.scales.optional(),
    plotThemeTokens: PlotSchema.shape.plotThemeTokens,
    plotThemeTokenRules: PlotSchema.shape.plotThemeTokenRules,
    plotTheme: PlotSchema.shape.plotTheme,
    width: PlotSchema.shape.width,
    height: PlotSchema.shape.height,
    coordinate: PlotSchema.shape.coordinate,
    composition: PlotSchema.shape.composition,
    marks: PlotSchema.shape.marks.optional(),
    guides: PlotSchema.shape.guides,
    meta: PlotSchema.shape.meta,
  })
  .superRefine((plot, context) => {
    if (plot.coordinate !== undefined && plot.composition !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['composition'],
        message: 'Chart Plot extensions cannot use coordinate and composition together',
      });
    }
  })
  .describe('Plot-owned fields accepted by a typed Chart recipe');

export type IRChartPlot = z.infer<typeof ChartPlotSchema>;
