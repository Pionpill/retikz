import { ChannelSchema, PathMarkSchema, PointMarkSchema } from '@retikz/plot';
import { z } from 'zod';

import { CHART_NAMESPACE, ChartCommonFieldShape, ChartPlotSchema, stripUndefinedProperties } from '../../_shared';
import { PointChartType } from '../constants';
import { StrictColorChannelSchema } from '../shared';

const ConnectedPointPatchFields = PointMarkSchema.pick({
  color: true,
  textColor: true,
  shape: true,
  fill: true,
  stroke: true,
  strokeWidth: true,
  fillOpacity: true,
  strokeOpacity: true,
  opacity: true,
  rotate: true,
  minimumSize: true,
  zIndex: true,
  align: true,
  lineHeight: true,
  maxTextWidth: true,
  cornerRadius: true,
  scale: true,
  padding: true,
  margin: true,
  dashed: true,
  dotted: true,
  dashPattern: true,
  font: true,
  boundary: true,
  shadow: true,
  blendMode: true,
  dx: true,
  dy: true,
  anchorId: true,
  label: true,
});

/** Connected Scatter 点允许覆盖的封闭表现字段 */
export const ConnectedPointPatchSchema = z
  .strictObject({ ...ConnectedPointPatchFields.shape })
  .describe('Strict visual patch for Connected Scatter points without layer ownership');

const ConnectedPathPatchFields = PathMarkSchema.pick({
  curve: true,
  connectNulls: true,
  strokeWidth: true,
  opacity: true,
  lineCap: true,
  lineJoin: true,
  roundedCorners: true,
  fill: true,
  stroke: true,
  strokeOpacity: true,
  fillRule: true,
  thickness: true,
  marks: true,
  dashPattern: true,
  shadow: true,
  blendMode: true,
  label: true,
});

/** Connected Scatter 连线允许覆盖的封闭表现字段 */
export const ConnectedPathPatchSchema = z
  .strictObject({ ...ConnectedPathPatchFields.shape })
  .describe('Strict visual patch for the open Connected Scatter connection path');

/** Connected Scatter 独有输入的完整数据结构 */
export const ConnectedScatterChartConfigSchema = z.strictObject({
  encoding: z
    .strictObject({
      x: ChannelSchema.describe('Required primary position channel'),
      y: ChannelSchema.describe('Required secondary position channel'),
      order: z.string().min(1).describe('Required data path that determines connection order'),
      series: z.string().min(1).optional().describe('Optional data path that groups independent connections'),
      color: StrictColorChannelSchema.optional().describe('Optional shared strict color channel'),
    })
    .describe('Required Connected Scatter position, ordering, grouping, and color roles'),
  mark: ConnectedPointPatchSchema.optional().describe('Optional visual patch for the points'),
  components: z
    .strictObject({
      connection: ConnectedPathPatchSchema.optional().describe('Optional visual patch for the connection path'),
    })
    .optional()
    .describe('Optional Connected Scatter component patches'),
});

export const ConnectedScatterChartSchema = z
  .strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
    type: z.literal(PointChartType.ConnectedScatter).describe('Connected Scatter Chart type discriminator'),
    ...ChartCommonFieldShape,
    plot: ChartPlotSchema,
    config: ConnectedScatterChartConfigSchema,
  })
  .describe('Connected Scatter Chart Source IR')
  .overwrite(stripUndefinedProperties);

/** Connected Scatter 可 JSON 序列化的精确源 IR */
export type IRConnectedScatterChart = z.infer<typeof ConnectedScatterChartSchema>;

/** Connected Scatter 点的表现字段局部配置 */
export type IRConnectedPointPatch = z.infer<typeof ConnectedPointPatchSchema>;

/** Connected Scatter 连线的表现字段局部配置 */
export type IRConnectedPathPatch = z.infer<typeof ConnectedPathPatchSchema>;
