import { PlotSpecSchema } from '@retikz/plot';
import { z } from 'zod';

import { ChartPresentationSchema } from '../presentation/schema';
import { ChartThemeTokenOverridesSchema } from '../style';
import { CHART_COMPOSITE_TYPE, CHART_NAMESPACE } from './constants';

/** 完整 PlotSpec 与 canonical presentation 组成的唯一 Chart composite */
export const ChartSchema = z.strictObject({
  namespace: z.literal(CHART_NAMESPACE),
  type: z.literal(CHART_COMPOSITE_TYPE),
  id: z.string().min(1).optional(),
  chartThemeTokens: ChartThemeTokenOverridesSchema.optional(),
  plot: PlotSpecSchema,
  presentation: ChartPresentationSchema.optional(),
});

/** 进入 Core composite dispatch 的 canonical Chart IR */
export type IRChart = z.infer<typeof ChartSchema>;
