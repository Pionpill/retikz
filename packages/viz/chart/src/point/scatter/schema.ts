import { ChannelSchema, OpacityChannelSchema, ShapeChannelSchema } from '@retikz/plot';
import { z } from 'zod';

import { CHART_NAMESPACE, ChartCommonFieldShape, ChartPlotSchema, omitUndefinedProperties } from '../../_shared';
import { PointChartType } from '../constants';
import {
  PointEncodingPatchBaseSchema,
  PointMarkPatchFields,
  StrictColorChannelSchema,
  StrictSizeChannelSchema,
} from '../shared';

const ScatterPointEncodingPatchSchema = PointEncodingPatchBaseSchema.describe(
  'Point encoding patch excluding the Scatter-owned x and y position channels',
);

/** Scatter 主点标记允许覆盖的封闭表现字段 */
export const ScatterPointPatchSchema = z
  .strictObject({
    ...PointMarkPatchFields.shape,
    encoding: ScatterPointEncodingPatchSchema.optional().describe(
      'Optional Point encoding patch for non-spatial built-in channels and custom coordinate roles',
    ),
  })
  .describe('Strict visual patch for a Scatter primary Point mark')
  .overwrite(omitUndefinedProperties);

export const ScatterChartConfigSchema = z.strictObject({
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
});

export const ScatterChartSchema = z
  .strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
    type: z.literal(PointChartType.Scatter).describe('Scatter Chart type discriminator'),
    ...ChartCommonFieldShape,
    plot: ChartPlotSchema,
    config: ScatterChartConfigSchema,
  })
  .describe('Scatter Chart Source IR')
  .overwrite(omitUndefinedProperties);

export type IRScatterChart = z.infer<typeof ScatterChartSchema>;

/** Scatter 主点标记的表现字段局部配置 */
export type IRScatterPointPatch = z.infer<typeof ScatterPointPatchSchema>;
