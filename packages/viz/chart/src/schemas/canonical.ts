import { ChannelSchema, PointMarkSchema, SizeChannelSchema } from '@retikz/plot';
import { z } from 'zod';

const ChannelFieldSchema = ChannelSchema.shape.field.unwrap();
const ChannelScaleSchema = ChannelSchema.shape.scale;

const StrictColorFieldChannelSchema = z
  .strictObject({
    field: ChannelFieldSchema.describe('Data path bound to the color channel'),
    scale: ChannelScaleSchema.describe('Optional registered color scale used by the field binding'),
  })
  .describe('Field-bound color channel resolved by Plot through its selected color scale');

const StrictColorConstantChannelSchema = z
  .strictObject({
    value: z.string().min(1).describe('Constant non-empty color applied directly to the mark'),
  })
  .describe('Constant color channel that bypasses scale resolution');

/** Scatter 系 canonical type 共用的严格颜色通道 */
export const StrictColorChannelSchema = z
  .union([StrictColorFieldChannelSchema, StrictColorConstantChannelSchema])
  .describe('Strict color channel with exactly one field or string constant branch');

const StrictSizeFieldChannelSchema = z
  .strictObject({
    field: ChannelFieldSchema.describe('Data path bound to the numeric size channel'),
    scale: ChannelScaleSchema.describe('Optional registered sqrt scale used by the field binding'),
  })
  .describe('Field-bound numeric size channel');

const StrictSizeConstantChannelSchema = z
  .strictObject({
    value: SizeChannelSchema.shape.value
      .unwrap()
      .describe('Constant non-negative final point radius that bypasses scale resolution'),
  })
  .describe('Constant point-size channel that bypasses scale resolution');

/** Scatter 系 canonical type 共用的严格尺寸通道 */
export const StrictSizeChannelSchema = z
  .union([StrictSizeFieldChannelSchema, StrictSizeConstantChannelSchema])
  .describe('Strict size channel with exactly one field or non-negative constant branch');

const ScatterPointPatchFields = PointMarkSchema.pick({
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
  layer: true,
  label: true,
});

/** Scatter 主 Point 允许覆盖的封闭表现字段 */
export const ScatterPointPatchSchema = z
  .strictObject({ ...ScatterPointPatchFields.shape })
  .describe('Strict visual patch for a Scatter primary Point mark');

/** 严格颜色通道 */
export type IRStrictColorChannel = z.infer<typeof StrictColorChannelSchema>;

/** 严格尺寸通道 */
export type IRStrictSizeChannel = z.infer<typeof StrictSizeChannelSchema>;

/** Scatter 主 Point 的表现字段 patch */
export type IRScatterPointPatch = z.infer<typeof ScatterPointPatchSchema>;
