import { z } from 'zod';
import { AtDirection } from '@retikz/core';
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
    x: ChannelSchema.optional().describe(
      'Primary position role channel; optional at the schema level — whether it is required is decided per coordinate system (cartesian2D / polar2D need x, cartesian1D needs its single dimension), validated fail-loud during lowering. The coordinate maps it to its first role — cartesian2D horizontal, polar2D angle. Its scale comes from the coordinate system',
    ),
    y: ChannelSchema.optional().describe(
      'Secondary position role channel; optional at the schema level — required by cartesian2D / polar2D, omitted by 1D coordinates, validated during lowering. The coordinate maps it to its second role — cartesian2D vertical, polar2D radius. Its scale comes from the coordinate system',
    ),
    a: ChannelSchema.optional().describe(
      'Ternary a component channel (ternary2D only; top vertex = a 100%); optional at the schema level, required together with b / c under ternary2D and validated during lowering. Auto-normalized by a+b+c at the coordinate',
    ),
    b: ChannelSchema.optional().describe(
      'Ternary b component channel (ternary2D only; bottom-right vertex = b 100%); optional at the schema level, required with a / c under ternary2D. Auto-normalized by a+b+c at the coordinate',
    ),
    c: ChannelSchema.optional().describe(
      'Ternary c component channel (ternary2D only; bottom-left vertex = c 100%); optional at the schema level, required with a / b under ternary2D. Auto-normalized by a+b+c at the coordinate',
    ),
  })
  .describe(
    'Positional channel bindings (x / y for 1D-2D coordinates, a / b / c for ternary2D); all optional at the schema level — the coordinate system decides which position roles are required and validates fail-loud during lowering (cartesian2D / polar2D need x+y, cartesian1D needs one dimension, ternary2D needs a/b/c). cartesian2D maps x→horizontal / y→vertical, polar2D maps x→angle / y→radius',
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

export const TextChannelSchema = z
  .object({
    field: z.string().min(1).optional().describe('Data path whose row value becomes the label string; mutually exclusive with value'),
    value: z.string().min(1).optional().describe('Constant label string for every datum (mutually exclusive with field)'),
    format: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional JSON-safe format string (d3-format for numeric fields / d3-time-format for temporal fields) applied to the field value before stringification; only meaningful together with field. A runtime resolveLabel(row) escape hatch (injected via options, never in the IR) overrides this for fully custom templates',
      ),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'text channel must set exactly one of `field` or `value`' })
  .describe('Text content channel: field → per-datum label string / value → a constant label / format → format string for a numeric or temporal field');

export const PointEncodingSchema = EncodingSchema.extend({
  size: SizeChannelSchema.optional().describe('Optional size channel: data-driven glyph radius via a sqrt scale, or a constant radius'),
  opacity: OpacityChannelSchema.optional().describe('Optional opacity channel: data-driven glyph opacity via a clamped linear scale, or a constant opacity'),
  shape: ShapeChannelSchema.optional().describe('Optional shape channel: categorical field → glyph shape via the built-in palette, or a constant shape name'),
  text: TextChannelSchema.optional().describe(
    'Optional text content channel: when set the point lowers to a borderless core Node carrying text (free-text / datum label) instead of a glyph; field → per-datum string, value → constant, format → numeric / temporal format',
  ),
}).describe('PointMark encoding: positional + color + optional size / opacity / shape glyph channels + optional text (text set → borderless text Node, absorbing the former standalone text mark)');

export const MarkLabelSchema = z
  .object({
    content: TextChannelSchema.describe('Label content channel (field / value / format)'),
    position: z
      .union([z.enum(AtDirection), z.number()])
      .optional()
      .describe('Placement around the host datum node border: 8-direction enum or numeric angle (degrees); mirrors core NodeLabelSchema.position. Default above'),
    distance: z.number().nonnegative().optional().describe('Gap between the host node border and the label center (user units); mirrors core NodeLabelSchema.distance. Default 12'),
    pin: z.boolean().optional().describe('Draw a leader line from the host node border to the label (core NodeLabelSchema.pin). Default false'),
  })
  .describe('Datum label attached to a positional mark: lowered onto each datum Node.label (core border-relative placement), the preferred path over a standalone TextMark');

/** 通道绑定：field（数据驱动）/ value（常量）二选一 */
export type Channel = z.infer<typeof ChannelSchema>;
/** 位置通道绑定（x / y / a / b / c；按坐标系角色解析，必填性下放 lowering） */
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
/** PointMark 专属通道绑定（位置 + 样式 + 可选 size / opacity / shape / text） */
export type PointEncoding = z.infer<typeof PointEncodingSchema>;
/** text 内容通道绑定（field 字段值转串 / value 常量串 / format 格式串） */
export type TextChannel = z.infer<typeof TextChannelSchema>;
/** 宿主 datum label 配置（对齐 core NodeLabelSchema 的 position / distance / pin + 内容通道） */
export type MarkLabel = z.infer<typeof MarkLabelSchema>;
