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
      'Primary position role channel; optional at the schema level. Whether it is required is decided per coordinate system (cartesian2D / polar2D need x, cartesian1D needs its single dimension), validated fail-loud during lowering. The coordinate maps it to its first role: cartesian2D horizontal, polar2D angle. Its scale comes from the coordinate system',
    ),
    y: ChannelSchema.optional().describe(
      'Secondary position role channel; optional at the schema level. Required by cartesian2D / polar2D, omitted by 1D coordinates, validated during lowering. The coordinate maps it to its second role: cartesian2D vertical, polar2D radius. Its scale comes from the coordinate system',
    ),
    z: ChannelSchema.optional().describe(
      'Third position role channel; optional at the schema level, required with x / y under ternary2D and validated during lowering. Auto-normalized with x+y+z at the coordinate',
    ),
  })
  .describe(
    'Positional channel bindings (x for 1D, x / y for 2D, x / y / z for ternary2D); all optional at the schema level. The coordinate system decides which position roles are required and validates fail-loud during lowering. cartesian2D maps x to horizontal / y to vertical, polar2D maps x to angle / y to radius',
  );

export const StyleEncodingSchema = z
  .object({
    color: ChannelSchema.optional().describe(
      'Color channel (non-positional): maps a field through an ordinal / color scale to the mark fill / stroke',
    ),
  })
  .describe('Non-positional style channel bindings fed to mark visuals (color today)');

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
    scale: z.string().min(1).optional().describe('Optional sqrt-scale name (only meaningful with field); omitted means a default radius (sqrt) scale is synthesized'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'size channel must set exactly one of `field` or `value`' })
  .describe('Size channel (PointMark legacy helper): field maps glyph radius via a sqrt scale; value is a constant final radius (px) that bypasses the scale');

export const OpacityChannelSchema = z
  .object({
    field: z.string().min(1).optional().describe('Data path bound to opacity; continuous, mapped through a clamped linear scale to [minOpacity, 1]'),
    value: z.number().min(0).max(1).optional().describe('Constant opacity 0..1, bypassing the scale (mutually exclusive with field)'),
    scale: z.string().min(1).optional().describe('Optional linear-scale name (only meaningful with field); omitted means a default opacity scale is synthesized'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'opacity channel must set exactly one of `field` or `value`' })
  .describe('Opacity channel (PointMark legacy helper): field maps glyph opacity via a clamped linear scale; value is a constant opacity that bypasses the scale');

export const ShapeChannelSchema = z
  .object({
    field: z.string().min(1).optional().describe('Data path bound to shape; categorical, mapped to a built-in glyph palette'),
    value: z.string().min(1).optional().describe('Constant glyph shape name: a core / registered node shape (mutually exclusive with field)'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'shape channel must set exactly one of `field` or `value`' })
  .describe('Shape channel (PointMark legacy helper): field maps glyph shape via the built-in shape palette; value is a constant core shape name. No explicit scale ref this round');

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
  .describe('Text content channel: field is a per-datum label string, value is a constant label, format is a format string for a numeric or temporal field');

export const PointEncodingSchema = PositionEncodingSchema.extend({
  text: TextChannelSchema.optional().describe(
    'Optional text content channel: when set the point lowers to a borderless core Node carrying text (free-text / datum label) instead of a glyph; field is a per-datum string, value is constant, format handles numeric / temporal format',
  ),
}).describe('PointMark encoding: positional channels plus optional text; visual properties live on the mark as MarkValueType fields');

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

/** Channel binding: exactly one of field (data-driven) or value (constant). */
export type Channel = z.infer<typeof ChannelSchema>;
/** Positional channel bindings (x / y / z); coordinate systems decide required roles during lowering. */
export type PositionEncoding = z.infer<typeof PositionEncodingSchema>;
/** Style channel bindings for non-position visual channels. */
export type StyleEncoding = z.infer<typeof StyleEncodingSchema>;
/** Mark channel bindings: positional channels plus shared style channels. */
export type Encoding = z.infer<typeof EncodingSchema>;
/** Legacy size channel helper schema type. PointMark canonical size is top-level MarkValueType. */
export type SizeChannel = z.infer<typeof SizeChannelSchema>;
/** Legacy opacity channel helper schema type. PointMark canonical opacity is top-level MarkValueType. */
export type OpacityChannel = z.infer<typeof OpacityChannelSchema>;
/** Legacy shape channel helper schema type. PointMark canonical shape is top-level MarkValueType. */
export type ShapeChannel = z.infer<typeof ShapeChannelSchema>;
/** PointMark encoding: positional channels plus optional text only. */
export type PointEncoding = z.infer<typeof PointEncodingSchema>;
/** Text content channel binding. */
export type TextChannel = z.infer<typeof TextChannelSchema>;
/** Host datum label config aligned with core NodeLabelSchema position / distance / pin. */
export type MarkLabel = z.infer<typeof MarkLabelSchema>;