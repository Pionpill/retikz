import { ChannelSchema, OpacityChannelSchema, ShapeChannelSchema } from '@retikz/plot';
import { z } from 'zod';

import { assertChartSpatialRoot, CHART_NAMESPACE, ChartSharedBaseSchema, ChartType } from '../../../schemas';
import { omitUndefinedProperties } from '../../../shared';
import { BubblePointPatchSchema, StrictColorChannelSchema, StrictSizeFieldChannelSchema } from '../shared';

/** Bubble 的完整 owner-private 输入 schema */
export const BubbleChartSpecSchema = z
  .strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart composite namespace discriminator'),
    type: z.literal(ChartType.Bubble).describe('Bubble Chart variant discriminator'),
    ...ChartSharedBaseSchema.shape,
    encoding: z
      .strictObject({
        x: ChannelSchema.describe('Required primary position channel'),
        y: ChannelSchema.describe('Required secondary position channel'),
        size: StrictSizeFieldChannelSchema.describe('Required quantitative field mapped to Point glyph area'),
        color: StrictColorChannelSchema.optional().describe('Optional strict point color channel'),
        opacity: OpacityChannelSchema.optional().describe('Optional Plot-owned point opacity channel'),
        shape: ShapeChannelSchema.optional().describe('Optional Plot-owned categorical point shape channel'),
      })
      .describe('Required Bubble position and quantitative size roles with optional visual channels'),
    mark: BubblePointPatchSchema.optional().describe('Optional visual patch for the primary Point glyph'),
  })
  .describe('Owner-private Bubble Chart variant input')
  .superRefine(assertChartSpatialRoot)
  .overwrite(omitUndefinedProperties);

/** Bubble 的 JSON-safe ChartSpec */
export type IRBubbleChartSpec = z.infer<typeof BubbleChartSpecSchema>;
