import type { infer as ZodInfer } from 'zod';

import { PlotSchema } from '@retikz/plot';
import { strictObject } from 'zod';

/** typed Chart 可显式追加的 Plot-owned fragment */
export const ChartPlotExtensionSchema = strictObject({
  transform: PlotSchema.shape.transform,
  scales: PlotSchema.shape.scales.optional(),
  plotDefaults: PlotSchema.shape.plotDefaults,
  plotRules: PlotSchema.shape.plotRules,
  composition: PlotSchema.shape.composition,
  marks: PlotSchema.shape.marks.optional(),
  guides: PlotSchema.shape.guides,
  meta: PlotSchema.shape.meta,
}).describe('Optional explicit Plot refinement; recipe-generated Plot state is never stored here');

/** Chart Plot fragment 的 IR 类型 */
export type IRChartPlotExtension = ZodInfer<typeof ChartPlotExtensionSchema>;
