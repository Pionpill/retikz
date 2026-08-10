import { GeometryLabelSchema, JsonValueSchema, NodeLabelSchema } from '@retikz/core';
import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

export const ChannelSchema = z
  .object({
    field: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Path accessor into a data row bound to this channel (e.g. "month" or "user.age"); resolved against the externally-supplied dataset at lowering and must yield a scalar',
      ),
    value: JsonValueSchema.optional().describe(
      'Constant JSON literal for this channel (mutually exclusive with field)',
    ),
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
  .describe(
    'A channel binding: exactly one of field (data-driven) / value (constant), plus an optional scale reference',
  );

export const PositionEncodingSchema = z
  .object({
    x: ChannelSchema.optional().describe(
      'Primary position role channel; optional at the schema level. Whether it is required is decided per coordinate system (cartesian2D / polar2D need x, cartesian1D needs its single dimension), validated fail-loud during lowering. The coordinate maps it to its first role: cartesian2D horizontal, polar2D angle. Its scale comes from the coordinate system',
    ),
    y: ChannelSchema.optional().describe(
      'Secondary position role channel; optional at the schema level. Required by cartesian2D / polar2D, omitted by 1D coordinates, validated during lowering. The coordinate maps it to its second role: cartesian2D vertical, polar2D radius. Its scale comes from the coordinate system',
    ),
  })
  .catchall(ChannelSchema)
  .describe(
    'Positional channel bindings. Built-ins use x for 1D and x / y for 2D; custom CoordinateDefinition roles may add arbitrary non-empty role keys. All are optional at the schema level, and the coordinate system decides which roles are required during lowering',
  );

export const MarkChannelEncodingSchema = z
  .object({
    color: ChannelSchema.optional().describe(
      'Color channel (non-positional): maps a field through an ordinal / color scale to the mark fill / stroke',
    ),
    channels: z
      .record(z.string().min(1), ChannelSchema)
      .optional()
      .describe(
        'Extension channel bindings: a map of registered channel name to field / constant binding, resolved by a ChannelDefinition supplied via options.channelDefinitions. A key colliding with a built-in channel name fails loud at lowering',
      ),
  })
  .describe('Non-positional mark / extension channel bindings fed to mark lowering');

export const EncodingSchema = z
  .object({
    ...PositionEncodingSchema.shape,
    ...MarkChannelEncodingSchema.shape,
  })
  .catchall(ChannelSchema)
  .describe(
    'Channel bindings for a mark: built-in keys cover x / y and shared mark channels; unknown non-empty keys are treated as custom coordinate position roles',
  );

export const SizeChannelSchema = z
  .object({
    field: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Data path bound to the size channel; resolves to a numeric magnitude mapped through a radius (sqrt) scale',
      ),
    value: NonNegativeNumberSchema.optional().describe(
      'Constant final radius in px, bypassing the scale entirely (mutually exclusive with field)',
    ),
    scale: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional sqrt-scale name (only meaningful with field); omitted means a default radius (sqrt) scale is synthesized',
      ),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), {
    message: 'size channel must set exactly one of `field` or `value`',
  })
  .describe(
    'Size channel (PointMark): field maps glyph radius via a sqrt scale; value is a constant final radius (px) that bypasses the scale',
  );

export const OpacityChannelSchema = z
  .object({
    field: z
      .string()
      .min(1)
      .optional()
      .describe('Data path bound to opacity; continuous, mapped through a clamped linear scale to [minOpacity, 1]'),
    value: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Constant opacity 0..1, bypassing the scale (mutually exclusive with field)'),
    scale: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional linear-scale name (only meaningful with field); omitted means a default opacity scale is synthesized',
      ),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), {
    message: 'opacity channel must set exactly one of `field` or `value`',
  })
  .describe(
    'Opacity channel (PointMark): field maps glyph opacity via a clamped linear scale; value is a constant opacity that bypasses the scale',
  );

export const ShapeChannelSchema = z
  .object({
    field: z
      .string()
      .min(1)
      .optional()
      .describe('Data path bound to shape; categorical, mapped to a built-in glyph palette'),
    value: z
      .string()
      .min(1)
      .optional()
      .describe('Constant glyph shape name: a core / registered node shape (mutually exclusive with field)'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), {
    message: 'shape channel must set exactly one of `field` or `value`',
  })
  .describe(
    'Shape channel (PointMark): field maps glyph shape via the built-in shape palette; value is a constant core shape name',
  );

export const TextChannelSchema = z
  .strictObject({
    field: z
      .string()
      .min(1)
      .optional()
      .describe('Data path whose row value becomes the label string; mutually exclusive with value'),
    value: z
      .string()
      .min(1)
      .optional()
      .describe('Constant label string for every datum (mutually exclusive with field)'),
    displayFormat: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional JSON-safe display format string (d3-format for numeric fields / d3-time-format for temporal fields) applied to the field value before stringification; only meaningful together with field. A runtime resolveLabel(row) escape hatch (injected via options, never in the IR) overrides this for fully custom templates',
      ),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), {
    message: 'text channel must set exactly one of `field` or `value`',
  })
  .describe(
    'Text content channel: field is a per-datum label string, value is a constant label, displayFormat is a display format string for a numeric or temporal field',
  );

export const LabelPinStyleSchema = z
  .object({
    stroke: z.string().optional().describe('Leader line color; defaults to the label color / currentColor'),
    strokeWidth: PositiveNumberSchema.optional().describe('Leader line width in user units; default 1'),
    dashPattern: z.array(z.number()).optional().describe('Leader dash pattern, e.g. [2, 2]'),
  })
  .describe('Styled label leader line options aligned with core NodeLabelSchema.pin');

export const PointEncodingSchema = PositionEncodingSchema.extend({
  text: TextChannelSchema.optional().describe(
    'Optional text content channel: when set the point lowers to a borderless core Node carrying text (free-text / datum label) instead of a glyph; field is a per-datum string, value is constant, displayFormat handles numeric / temporal display formatting',
  ),
  ...MarkChannelEncodingSchema.shape,
}).describe(
  'PointMark encoding: positional channels plus optional text and extension channel bindings; built-in node properties live on the mark as MarkValueType fields',
);

export const MarkLabelContentSchema = z
  .strictObject({
    field: z
      .string()
      .min(1)
      .optional()
      .describe('Data path whose row value becomes the label text; mutually exclusive with value'),
    value: NodeLabelSchema.shape.text
      .optional()
      .describe('Constant label text for every datum; mutually exclusive with field'),
    displayFormat: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional JSON-safe display format string applied to a field value before stringification; only meaningful together with field',
      ),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), {
    message: 'label content must set exactly one of `field` or `value`',
  })
  .describe(
    'Plot label content binding: exactly one of field (data-driven) or value (constant), plus optional displayFormat',
  );

const omitText = <T extends Record<string, unknown>>(shape: T): Omit<T, 'text'> =>
  Object.fromEntries(Object.entries(shape).filter(([key]) => key !== 'text')) as Omit<T, 'text'>;

const nodeLabelShape = omitText(NodeLabelSchema.shape);
const geometryLabelShape = omitText(GeometryLabelSchema.shape);

export const MarkNodeLabelSchema = z
  .strictObject({
    ...nodeLabelShape,
    content: MarkLabelContentSchema.describe('Node label content binding (field / value / displayFormat)'),
  })
  .superRefine((label, ctx) => {
    if (label.placement === 'inside' && label.pin) {
      ctx.addIssue({
        code: 'custom',
        path: ['pin'],
        message: 'Node label pin is only supported for outside placement.',
      });
    }
  })
  .describe(
    'Plot label attached to a core Node.label host; all geometry fields are inherited from core NodeLabelSchema',
  );

export const MarkGeometryLabelSchema = z
  .strictObject({
    ...geometryLabelShape,
    content: MarkLabelContentSchema.describe('Geometry label content binding (field / value / displayFormat)'),
  })
  .describe(
    'Plot label attached to a path-like GeometryLabel host; all geometry fields are inherited from core GeometryLabelSchema',
  );

export const MarkNodeLabelListSchema = z
  .union([MarkNodeLabelSchema, z.array(MarkNodeLabelSchema).min(1)])
  .describe('Single or multiple node-host labels; array order is preserved');

export const MarkGeometryLabelListSchema = z
  .union([MarkGeometryLabelSchema, z.array(MarkGeometryLabelSchema).min(1)])
  .describe('Single or multiple geometry-host labels; array order is preserved');

export const MarkLabelSchema = z
  .union([MarkNodeLabelSchema, MarkGeometryLabelSchema])
  .describe('Host-inferred plot label input; mark definitions choose node or geometry host schema');

export const MarkLabelSchemaByHost = {
  node: MarkNodeLabelListSchema,
  geometry: MarkGeometryLabelListSchema,
} as const;
