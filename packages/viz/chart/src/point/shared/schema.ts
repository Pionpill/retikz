import { ChannelSchema, PointEncodingSchema, PointMarkSchema, SizeChannelSchema } from '@retikz/plot';
import { z } from 'zod';

import { stripUndefinedProperties } from '../../_shared';

const ChannelFieldSchema = ChannelSchema.shape.field.unwrap();
const ChannelScaleSchema = ChannelSchema.shape.scale;

const StrictColorFieldChannelSchema = z
  .strictObject({
    field: ChannelFieldSchema.describe('Data path bound to the color channel'),
    scale: ChannelScaleSchema.describe('Optional registered color scale used by the field binding'),
    value: z.never().optional().describe('Unavailable constant branch key accepted only when explicitly undefined'),
  })
  .describe('Field-bound color channel resolved by Plot through its selected color scale');

const StrictColorConstantChannelSchema = z
  .strictObject({
    value: z.string().min(1).describe('Constant non-empty color applied directly to the mark'),
    field: z.never().optional().describe('Unavailable field branch key accepted only when explicitly undefined'),
    scale: z.never().optional().describe('Unavailable field scale key accepted only when explicitly undefined'),
  })
  .describe('Constant color channel that bypasses scale resolution');

/** Point 类型共用的严格颜色通道 */
export const StrictColorChannelSchema = z
  .union([StrictColorFieldChannelSchema, StrictColorConstantChannelSchema])
  .describe('Strict color channel with exactly one field or string constant branch')
  .overwrite(stripUndefinedProperties);

/** Point 类型共用的严格字段尺寸通道 */
export const StrictSizeFieldChannelSchema = z
  .strictObject({
    field: ChannelFieldSchema.describe('Data path bound to the numeric size channel'),
    scale: ChannelScaleSchema.describe('Optional registered sqrt scale used by the field binding'),
    value: z.never().optional().describe('Unavailable constant branch key accepted only when explicitly undefined'),
  })
  .describe('Field-bound numeric size channel')
  .overwrite(stripUndefinedProperties);

const StrictSizeConstantChannelSchema = z
  .strictObject({
    value: SizeChannelSchema.shape.value
      .unwrap()
      .describe('Constant non-negative final point radius that bypasses scale resolution'),
    field: z.never().optional().describe('Unavailable field branch key accepted only when explicitly undefined'),
    scale: z.never().optional().describe('Unavailable field scale key accepted only when explicitly undefined'),
  })
  .describe('Constant point-size channel that bypasses scale resolution');

/** Point 类型共用的严格尺寸通道 */
export const StrictSizeChannelSchema = z
  .union([StrictSizeFieldChannelSchema, StrictSizeConstantChannelSchema])
  .describe('Strict size channel with exactly one field or non-negative constant branch')
  .overwrite(stripUndefinedProperties);

/** Point 主标记允许各封装类型局部覆盖的表现字段 */
export const PointMarkPatchFields = PointMarkSchema.omit({
  type: true,
  id: true,
  transform: true,
  coordinateView: true,
  encoding: true,
});

/** Point 局部配置可覆盖的非空间编码字段 */
export const PointEncodingPatchBaseSchema = PointEncodingSchema.extend({
  x: z.never().optional().describe('Reserved primary position channel supplied by the Point Chart recipe'),
  y: z.never().optional().describe('Reserved secondary position channel supplied by the Point Chart recipe'),
});

/** Bubble 可复用的 Point 编码扩展通道结构 */
export const PointExtensionChannelsSchema = PointEncodingSchema.shape.channels.unwrap();

/** 严格颜色通道 */
export type IRStrictColorChannel = z.infer<typeof StrictColorChannelSchema>;

/** 严格尺寸通道 */
export type IRStrictSizeChannel = z.infer<typeof StrictSizeChannelSchema>;

/** 严格字段尺寸通道 */
export type IRStrictSizeFieldChannel = z.infer<typeof StrictSizeFieldChannelSchema>;
