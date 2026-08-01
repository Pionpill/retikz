import { ChannelSchema, OpacityChannelSchema, ShapeChannelSchema } from '@retikz/plot';
import { z } from 'zod';

import { ScatterPointPatchSchema, StrictColorChannelSchema, StrictSizeChannelSchema } from './canonical';
import { CHART_NAMESPACE } from './constants';
import { assertChartSpatialRoot, ChartSharedBaseSchema } from './shared';

/** Scatter canonical type 判别值 */
export const ScatterChartType = 'scatter' as const;

/** Scatter 的完整 owner-private 输入 schema */
export const ScatterChartSpecSchema = z
  .strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart composite namespace discriminator'),
    type: z.literal(ScatterChartType).describe('Scatter Chart variant discriminator'),
    ...ChartSharedBaseSchema.shape,
    encoding: z
      .strictObject({
        x: ChannelSchema.describe('Required primary position channel'),
        y: ChannelSchema.describe('Required secondary position channel'),
        color: StrictColorChannelSchema.optional().describe('Optional strict point color channel'),
        size: StrictSizeChannelSchema.optional().describe('Optional strict point radius channel'),
        opacity: OpacityChannelSchema.optional().describe('Optional Plot-owned point opacity channel'),
        shape: ShapeChannelSchema.optional().describe('Optional Plot-owned categorical point shape channel'),
      })
      .describe('Required Scatter position roles and optional visual channels'),
    mark: ScatterPointPatchSchema.optional().describe('Optional visual patch for the primary Point mark'),
  })
  .describe('Owner-private Scatter Chart variant input')
  .superRefine(assertChartSpatialRoot);

/** Scatter 的 JSON-safe ChartSpec */
export type IRScatterChartSpec = z.infer<typeof ScatterChartSpecSchema>;
