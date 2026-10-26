import { PlotSchema } from '@retikz/plot';
import type { infer as ZodInfer, ZodObject, ZodOptional } from 'zod';
import { strictObject } from 'zod';

/** typed Chart 可显式追加的 Plot-owned fragment */
export const ChartPlotExtensionSchema: ZodObject<{
  transform: typeof PlotSchema.shape.transform;
  scales: ZodOptional<typeof PlotSchema.shape.scales>;
  defaultPlot: typeof PlotSchema.shape.defaultPlot;
  plotRules: typeof PlotSchema.shape.plotRules;
  composition: typeof PlotSchema.shape.composition;
  marks: ZodOptional<typeof PlotSchema.shape.marks>;
  guides: typeof PlotSchema.shape.guides;
  meta: typeof PlotSchema.shape.meta;
}> = strictObject({
  transform: PlotSchema.shape.transform,
  scales: PlotSchema.shape.scales.optional(),
  defaultPlot: PlotSchema.shape.defaultPlot,
  plotRules: PlotSchema.shape.plotRules,
  composition: PlotSchema.shape.composition,
  marks: PlotSchema.shape.marks.optional(),
  guides: PlotSchema.shape.guides,
  meta: PlotSchema.shape.meta,
}).describe('Optional explicit Plot refinement; recipe-generated Plot state is never stored here');

/** Chart Plot fragment 的 IR 类型 */
export type IRChartPlotExtension = ZodInfer<typeof ChartPlotExtensionSchema>;
