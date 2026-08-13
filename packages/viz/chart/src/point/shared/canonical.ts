import { ChannelSchema, PointEncodingSchema, PointMarkSchema, SizeChannelSchema } from '@retikz/plot';
import { z } from 'zod';

import { normalizeUndefinedObjectInput, omitUndefinedProperties } from '../../shared';

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

/** Scatter 系 canonical type 共用的严格颜色通道 */
export const StrictColorChannelSchema = z
  .union([StrictColorFieldChannelSchema, StrictColorConstantChannelSchema])
  .describe('Strict color channel with exactly one field or string constant branch')
  .overwrite(omitUndefinedProperties);

/** Bubble 与 field-bound Scatter 共用的严格字段尺寸通道 */
export const StrictSizeFieldChannelSchema = z
  .strictObject({
    field: ChannelFieldSchema.describe('Data path bound to the numeric size channel'),
    scale: ChannelScaleSchema.describe('Optional registered sqrt scale used by the field binding'),
    value: z.never().optional().describe('Unavailable constant branch key accepted only when explicitly undefined'),
  })
  .describe('Field-bound numeric size channel')
  .overwrite(omitUndefinedProperties);

const StrictSizeConstantChannelSchema = z
  .strictObject({
    value: SizeChannelSchema.shape.value
      .unwrap()
      .describe('Constant non-negative final point radius that bypasses scale resolution'),
    field: z.never().optional().describe('Unavailable field branch key accepted only when explicitly undefined'),
    scale: z.never().optional().describe('Unavailable field scale key accepted only when explicitly undefined'),
  })
  .describe('Constant point-size channel that bypasses scale resolution');

/** Scatter 系 canonical type 共用的严格尺寸通道 */
export const StrictSizeChannelSchema = z
  .union([StrictSizeFieldChannelSchema, StrictSizeConstantChannelSchema])
  .describe('Strict size channel with exactly one field or non-negative constant branch')
  .overwrite(omitUndefinedProperties);

const ScatterPointPatchFields = PointMarkSchema.omit({
  type: true,
  id: true,
  transform: true,
  coordinateView: true,
  encoding: true,
});

const ScatterPointEncodingPatchBaseSchema = PointEncodingSchema.extend({
  x: z.never().optional().describe('Reserved primary position channel supplied by the Point Chart recipe'),
  y: z.never().optional().describe('Reserved secondary position channel supplied by the Point Chart recipe'),
});

const PointExtensionChannelsSchema = PointEncodingSchema.shape.channels.unwrap();

const BubblePointChannelsPatchSchema = z
  .preprocess(
    normalizeUndefinedObjectInput,
    PointExtensionChannelsSchema.superRefine((channels, ctx) => {
      if (Object.hasOwn(channels, 'size')) {
        ctx.addIssue({
          code: 'custom',
          path: ['size'],
          message: 'Bubble Point extension channels cannot redefine the quantitative size role',
        });
      }
    }),
  )
  .describe('Point extension channels excluding the Bubble-owned quantitative size role');

const ScatterPointEncodingPatchSchema = ScatterPointEncodingPatchBaseSchema.describe(
  'Point encoding patch excluding the Scatter-owned x and y position channels',
);

/** Scatter 主 Point 允许覆盖的封闭表现字段 */
export const ScatterPointPatchSchema = z
  .strictObject({
    ...ScatterPointPatchFields.shape,
    encoding: ScatterPointEncodingPatchSchema.optional().describe(
      'Optional Point encoding patch for non-spatial built-in channels and custom coordinate roles',
    ),
  })
  .describe('Strict visual patch for a Scatter primary Point mark')
  .overwrite(omitUndefinedProperties);

const BubblePointPatchFields = ScatterPointPatchFields.omit({
  size: true,
});

const BubblePointEncodingPatchSchema = ScatterPointEncodingPatchBaseSchema.extend({
  size: z.never().optional().describe('Reserved quantitative size channel supplied by the Bubble variant'),
  text: z.never().optional().describe('Text mode is unavailable because Bubble requires a Point glyph carrier'),
  channels: BubblePointChannelsPatchSchema.optional().describe(
    'Optional Point extension channels excluding the Bubble-owned quantitative size role',
  ),
}).describe('Point encoding patch excluding Bubble-owned position, size, and text-mode channels');

/** Bubble 主 Point 允许覆盖的封闭表现字段 */
export const BubblePointPatchSchema = z
  .strictObject({
    ...BubblePointPatchFields.shape,
    size: z.never().optional().describe('Reserved quantitative size channel supplied by the Bubble variant'),
    encoding: BubblePointEncodingPatchSchema.optional().describe(
      'Optional Point encoding patch excluding Bubble-owned position, size, and text-mode channels',
    ),
  })
  .describe('Strict visual patch for a Bubble primary Point glyph')
  .overwrite(omitUndefinedProperties);

/** 严格颜色通道 */
export type IRStrictColorChannel = z.infer<typeof StrictColorChannelSchema>;

/** 严格尺寸通道 */
export type IRStrictSizeChannel = z.infer<typeof StrictSizeChannelSchema>;

/** 严格字段尺寸通道 */
export type IRStrictSizeFieldChannel = z.infer<typeof StrictSizeFieldChannelSchema>;

/** Scatter 主 Point 的表现字段 patch */
export type IRScatterPointPatch = z.infer<typeof ScatterPointPatchSchema>;

/** Bubble 主 Point 的表现字段 patch */
export type IRBubblePointPatch = z.infer<typeof BubblePointPatchSchema>;
