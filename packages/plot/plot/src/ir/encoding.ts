import { z } from 'zod';
import { ScalarValueSchema } from './data';

export const ChannelSchema = z
  .object({
    field: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Path accessor into a data row bound to this channel (e.g. "month" or "user.age"); resolved against the externally-supplied dataset at lowering and must yield a scalar',
      ),
    value: ScalarValueSchema.optional().describe('Constant scalar literal for this channel (mutually exclusive with field)'),
    scale: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Scale name driving this channel (required for non-positional channels like color; positional x / y derive their scale from the coordinate system and omit this)',
      ),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), {
    message: 'channel must set exactly one of `field` or `value`',
  })
  .describe('A channel binding: exactly one of field (data-driven) / value (constant), plus an optional scale reference');

export const PositionEncodingSchema = z
  .object({
    x: ChannelSchema.describe(
      'Primary position channel (required); the coordinate system maps it to its first role — cartesian2D horizontal, polar2D angle. Its scale comes from the coordinate system',
    ),
    y: ChannelSchema.describe(
      'Secondary position channel (required); the coordinate system maps it to its second role — cartesian2D vertical, polar2D radius. Its scale comes from the coordinate system',
    ),
  })
  .describe(
    'Positional channel bindings (x / y, both required); the coordinate system maps them to its roles — cartesian2D x→horizontal / y→vertical, polar2D x→angle / y→radius',
  );

export const StyleEncodingSchema = z
  .object({
    color: ChannelSchema.optional().describe(
      'Color channel (non-positional): maps a field through an ordinal / color scale to the mark fill / stroke',
    ),
  })
  .describe('Non-positional style channel bindings fed to mark visuals (color today; opacity / size / shape later)');

export const EncodingSchema = PositionEncodingSchema.merge(StyleEncodingSchema).describe(
  'Channel bindings for a mark: positional channels (consumed by the coordinate system) composed with non-positional style channels (fed to mark visuals)',
);

export const SizeChannelSchema = z
  .object({
    field: z
      .string()
      .min(1)
      .optional()
      .describe('Data path bound to the size channel; resolves to a numeric magnitude mapped through a radius (sqrt) scale'),
    value: z.number().finite().nonnegative().optional().describe('Constant final radius in px, bypassing the scale entirely (mutually exclusive with field)'),
    scale: z.string().min(1).optional().describe('Optional sqrt-scale name (only meaningful with field); omitted → a default radius (sqrt) scale is synthesized'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'size channel must set exactly one of `field` or `value`' })
  .describe('Size channel (PointMark only): field → glyph radius via a sqrt scale; value → a constant final radius (px) that bypasses the scale');

export const OpacityChannelSchema = z
  .object({
    field: z.string().min(1).optional().describe('Data path bound to opacity; continuous, mapped through a clamped linear scale to [minOpacity, 1]'),
    value: z.number().min(0).max(1).optional().describe('Constant opacity 0..1, bypassing the scale (mutually exclusive with field)'),
    scale: z.string().min(1).optional().describe('Optional linear-scale name (only meaningful with field); omitted → a default opacity scale is synthesized'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'opacity channel must set exactly one of `field` or `value`' })
  .describe('Opacity channel (PointMark only): field → glyph opacity via a clamped linear scale; value → a constant opacity that bypasses the scale');

export const ShapeChannelSchema = z
  .object({
    field: z.string().min(1).optional().describe('Data path bound to shape; categorical, mapped to a built-in glyph palette'),
    value: z.string().min(1).optional().describe('Constant glyph shape name — a core / registered node shape (mutually exclusive with field)'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'shape channel must set exactly one of `field` or `value`' })
  .describe('Shape channel (PointMark only): field → glyph shape via the built-in shape palette; value → a constant core shape name. No explicit scale ref this round');

export const PointEncodingSchema = EncodingSchema.extend({
  size: SizeChannelSchema.optional().describe('Optional size channel: data-driven glyph radius via a sqrt scale, or a constant radius'),
  opacity: OpacityChannelSchema.optional().describe('Optional opacity channel: data-driven glyph opacity via a clamped linear scale, or a constant opacity'),
  shape: ShapeChannelSchema.optional().describe('Optional shape channel: categorical field → glyph shape via the built-in palette, or a constant shape name'),
}).describe('PointMark encoding: positional + color + optional size / opacity / shape (PointMark-only channels, not in the shared style encoding)');

/** 通道绑定：field（数据驱动）/ value（常量）二选一 */
export type Channel = z.infer<typeof ChannelSchema>;
/** 位置通道绑定（x / y / angle / radius；按坐标系角色解析） */
export type PositionEncoding = z.infer<typeof PositionEncodingSchema>;
/** 样式通道绑定（非位置视觉属性；当前仅 color） */
export type StyleEncoding = z.infer<typeof StyleEncodingSchema>;
/** mark 的通道绑定（位置 + 样式复合） */
export type Encoding = z.infer<typeof EncodingSchema>;
/** size 通道绑定（PointMark 专属；field 过 sqrt 半径 scale / value 常量半径 px） */
export type SizeChannel = z.infer<typeof SizeChannelSchema>;
/** opacity 通道绑定（PointMark 专属；field 过 clamp linear scale / value 常量 0..1） */
export type OpacityChannel = z.infer<typeof OpacityChannelSchema>;
/** shape 通道绑定（PointMark 专属；field 分类映射到 glyph 调色板 / value 常量 shape 名） */
export type ShapeChannel = z.infer<typeof ShapeChannelSchema>;
/** PointMark 专属通道绑定（位置 + 样式 + 可选 size / opacity / shape） */
export type PointEncoding = z.infer<typeof PointEncodingSchema>;
