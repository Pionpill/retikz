import { ChannelSchema, OpacityChannelSchema, ShapeChannelSchema } from '@retikz/plot';
import { z } from 'zod';

import {
  CHART_NAMESPACE,
  ChartCommonFieldShape,
  ChartPlotSchema,
  normalizeUndefinedObjectInput,
  omitUndefinedProperties,
} from '../../_shared';
import { PointChartType } from '../constants';
import {
  PointEncodingPatchBaseSchema,
  PointExtensionChannelsSchema,
  PointMarkPatchFields,
  StrictColorChannelSchema,
  StrictSizeFieldChannelSchema,
} from '../shared';

const BubblePointChannelsPatchSchema = z
  .preprocess(
    normalizeUndefinedObjectInput,
    PointExtensionChannelsSchema.superRefine((channels, context) => {
      if (Object.hasOwn(channels, 'size')) {
        context.addIssue({
          code: 'custom',
          path: ['size'],
          message: 'Bubble Point extension channels cannot redefine the quantitative size role',
        });
      }
    }),
  )
  .describe('Point extension channels excluding the Bubble-owned quantitative size role');

const BubblePointEncodingPatchSchema = PointEncodingPatchBaseSchema.extend({
  size: z.never().optional().describe('Reserved quantitative size channel supplied by the Bubble variant'),
  text: z.never().optional().describe('Text mode is unavailable because Bubble requires a Point glyph carrier'),
  channels: BubblePointChannelsPatchSchema.optional().describe(
    'Optional Point extension channels excluding the Bubble-owned quantitative size role',
  ),
}).describe('Point encoding patch excluding Bubble-owned position, size, and text-mode channels');

/** Bubble 主点标记允许覆盖的封闭表现字段 */
export const BubblePointPatchSchema = z
  .strictObject({
    ...PointMarkPatchFields.omit({ size: true }).shape,
    size: z.never().optional().describe('Reserved quantitative size channel supplied by the Bubble variant'),
    encoding: BubblePointEncodingPatchSchema.optional().describe(
      'Optional Point encoding patch excluding Bubble-owned position, size, and text-mode channels',
    ),
  })
  .describe('Strict visual patch for a Bubble primary Point glyph')
  .overwrite(omitUndefinedProperties);

export const BubbleChartConfigSchema = z.strictObject({
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
});

export const BubbleChartSchema = z
  .strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
    type: z.literal(PointChartType.Bubble).describe('Bubble Chart type discriminator'),
    ...ChartCommonFieldShape,
    plot: ChartPlotSchema,
    config: BubbleChartConfigSchema,
  })
  .describe('Bubble Chart Source IR')
  .overwrite(omitUndefinedProperties);

export type IRBubbleChart = z.infer<typeof BubbleChartSchema>;

/** Bubble 主点标记的表现字段局部配置 */
export type IRBubblePointPatch = z.infer<typeof BubblePointPatchSchema>;
