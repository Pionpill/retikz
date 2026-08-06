import { ChannelSchema, PathMarkSchema, PointMarkSchema } from '@retikz/plot';
import { z } from 'zod';

import { assertChartSpatialRoot, CHART_NAMESPACE, ChartSharedBaseSchema, ChartType } from '../../../schemas';
import { omitUndefinedProperties } from '../../../shared';
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

/** Connected Scatter points 允许覆盖的封闭表现字段 */
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

/** Connected Scatter connection 允许覆盖的封闭表现字段 */
export const ConnectedPathPatchSchema = z
  .strictObject({ ...ConnectedPathPatchFields.shape })
  .describe('Strict visual patch for the open Connected Scatter connection path');

/** Connected Scatter 的完整 owner-private 输入 schema */
export const ConnectedScatterChartSpecSchema = z
  .strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart composite namespace discriminator'),
    type: z.literal(ChartType.ConnectedScatter).describe('Connected Scatter Chart variant discriminator'),
    ...ChartSharedBaseSchema.shape,
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
  })
  .describe('Owner-private Connected Scatter Chart variant input')
  .superRefine(assertChartSpatialRoot)
  .overwrite(omitUndefinedProperties);

/** Connected Scatter 的 JSON-safe ChartSpec */
export type IRConnectedScatterChartSpec = z.infer<typeof ConnectedScatterChartSpecSchema>;

/** Connected Scatter points 的表现字段 patch */
export type IRConnectedPointPatch = z.infer<typeof ConnectedPointPatchSchema>;

/** Connected Scatter connection 的表现字段 patch */
export type IRConnectedPathPatch = z.infer<typeof ConnectedPathPatchSchema>;
