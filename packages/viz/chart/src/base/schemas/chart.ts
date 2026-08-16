import { PlotSchema } from '@retikz/plot';
import { z } from 'zod';

import { ChartPresentationSchema } from '../presentation/schema';
import { ChartThemeTokenOverridesSchema } from '../style';
import { CHART_COMPOSITE_TYPE, CHART_NAMESPACE } from './constants';

/** 完整 IRPlot 与 canonical presentation 组成的唯一 Chart composite */
export const ChartSchema = z
  .strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart composite namespace discriminator'),
    type: z.literal(CHART_COMPOSITE_TYPE).describe('Canonical Chart composite type discriminator'),
    id: z.string().min(1).optional().describe('Optional stable Chart identity and outer scope id'),
    chartThemeTokens: ChartThemeTokenOverridesSchema.optional().describe('Sparse Chart-owned theme token overrides'),
    plot: PlotSchema.describe('Complete canonical IRPlot owned by Plot'),
    presentation: ChartPresentationSchema.optional().describe('Optional canonical Chart presentation around the Plot'),
  })
  .describe('Canonical Chart composite IR entering Core composite dispatch');

/** 进入 Core composite dispatch 的 canonical Chart IR */
export type IRChart = z.infer<typeof ChartSchema>;
