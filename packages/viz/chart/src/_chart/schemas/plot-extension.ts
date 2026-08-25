import type { infer as ZodInfer } from 'zod';

import { PlotSchema } from '@retikz/plot';
import { strictObject } from 'zod';

/** typed Chart 可显式追加的 Plot-owned fragment */
export const ChartPlotExtensionSchema = strictObject({
  transform: PlotSchema.shape.transform,
  scales: PlotSchema.shape.scales.optional(),
  plotThemeTokens: PlotSchema.shape.plotThemeTokens,
  plotThemeTokenRules: PlotSchema.shape.plotThemeTokenRules,
  plotTheme: PlotSchema.shape.plotTheme,
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
        message: 'Chart Plot extension cannot contain both coordinate and composition',
      });
    }
  })
  .describe('Optional explicit Plot refinement; recipe-generated Plot state is never stored here');

/** Chart Plot fragment 的 IR 类型 */
export type IRChartPlotExtension = ZodInfer<typeof ChartPlotExtensionSchema>;
