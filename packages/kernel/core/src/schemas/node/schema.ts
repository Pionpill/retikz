import { z } from 'zod';

import { Side } from '../../shared';
import { AnimationTrackSchema } from '../animation';
import { BoundarySchema } from '../boundary';
import { FontSchema } from '../font';
import { JsonObjectSchema } from '../json';
import {
  AtPositionSchema,
  BetweenPositionSchema,
  OffsetPositionSchema,
  PolarPositionSchema,
  PositionSchema,
} from '../position';
import { AngleDegreesSchema, NormalizedFractionSchema } from '../scalar';
import { ShapeRefSchema } from '../shape';
import { CssColorSchema, GraphicStyleSchema } from '../style';
import { createLabelVisualStyleShape, LabelTextContentSchema, TextBlockSchema } from '../text';
import { NodeLabelPlacement, NodeLabelPosition, NodeLabelRotateMode, NodeTextAlign } from './constants';

export const NodeLabelBoundaryPositionSchema = z
  .object({
    boundary: z
      .enum(Side)
      .describe('Canonical box-like node boundary side used as the label attachment line.'),
    fraction: NormalizedFractionSchema
      .optional()
      .describe('Normalized position along the selected boundary. Defaults to 0.5.'),
  })
  .strict()
  .describe('Label position on a box-like node boundary.');

export const BoxSpacingSchema = z
  .object({
    default: z.number().nonnegative().optional().describe('Fallback spacing for all sides.'),
    x: z.number().nonnegative().optional().describe('Horizontal spacing for left and right sides.'),
    y: z.number().nonnegative().optional().describe('Vertical spacing for top and bottom sides.'),
    left: z.number().nonnegative().optional().describe('Left-side spacing.'),
    right: z.number().nonnegative().optional().describe('Right-side spacing.'),
    top: z.number().nonnegative().optional().describe('Top-side spacing.'),
    bottom: z.number().nonnegative().optional().describe('Bottom-side spacing.'),
  })
  .strict()
  .describe('CSS-like box spacing overrides. Side fields override axis fields, then default.');

const BoxSpacingValueSchema = z.union([z.number().nonnegative(), BoxSpacingSchema]);

export const AxisScaleSchema = z
  .object({
    default: z.number().positive().optional().describe('Fallback scale factor for both axes.'),
    x: z.number().positive().optional().describe('Horizontal scale factor.'),
    y: z.number().positive().optional().describe('Vertical scale factor.'),
  })
  .strict()
  .describe('Axis-specific scale overrides. Axis fields override default.');

const AxisScaleValueSchema = z.union([z.number().positive(), AxisScaleSchema]);

export const BoxSizeSchema = z
  .object({
    default: z.number().nonnegative().optional().describe('Fallback size for width and height.'),
    width: z.number().nonnegative().optional().describe('Width size.'),
    height: z.number().nonnegative().optional().describe('Height size.'),
  })
  .strict()
  .describe('Box size overrides. Width and height override default.');

const BoxSizeValueSchema = z.union([z.number().nonnegative(), BoxSizeSchema]);

export const NodeLabelPinSchema = z
  .object({
    stroke: CssColorSchema.optional().describe('Leader line color; defaults to the label color / currentColor'),
    strokeWidth: z.number().positive().optional().describe('Leader line width (user units); default 1'),
    dashPattern: z.array(z.number()).optional().describe('Leader dash pattern lengths in user units.'),
  })
  .describe('Leader line style overrides for an outside node label.');

export const NodeLabelSchema = z
  .object({
    ...createLabelVisualStyleShape({
      textColor: 'Label text color; falls back to currentColor.',
      opacity: 'Label-only opacity, multiplied with node opacity when both are set.',
      font: 'Label font overrides. Missing fields inherit from the parent node font.',
    }),
    text: LabelTextContentSchema,
    position: z
      .union([z.enum(NodeLabelPosition), AngleDegreesSchema, NodeLabelBoundaryPositionSchema])
      .optional()
      .describe(
        'Label attachment point: canonical direction, center, angle, or `{ boundary, fraction }`. Omitted fields use top.',
      ),
    placement: z
      .enum(NodeLabelPlacement)
      .optional()
      .describe('Whether the label is offset outside or inside the selected attachment point. Default `outside`.'),
    distance: z
      .number()
      .nonnegative()
      .optional()
      .describe('Gap between the node border and the label center, in user units. Default 12.'),
    rotate: z
      .union([z.enum(NodeLabelRotateMode), AngleDegreesSchema])
      .optional()
      .describe(
        'Label self-rotation: none, radial, tangent, or an explicit angle in degrees.',
      ),
    keepUpright: z
      .boolean()
      .optional()
      .describe(
        'When true, flips the rotated label 180 deg if it would otherwise read upside-down (more than 90 deg from upright). Default false (strict geometric angle).',
      ),
    pin: z
      .union([z.boolean(), NodeLabelPinSchema])
      .optional()
      .describe(
        'Outside-label leader line. Use true for defaults or an object for style overrides.',
      ),
  })
  .superRefine((label, ctx) => {
    if (label.placement === NodeLabelPlacement.Inside && label.pin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pin'],
        message: 'Node label pin is only supported for outside placement.',
      });
    }
  })
  .describe('Extra text attached around a node border. Multiple labels supported via array form on `Node.label`.');

export const NodeSchema = z
  .object({
    type: z.literal('node').describe('Discriminator marking this child as a node'),
    ...GraphicStyleSchema.shape,
    id: z
      .string()
      .min(1)
      .optional()
      .describe('Optional unique id; required if any path needs to reference this node by string'),
    shape: z
      .union([z.string().min(1), ShapeRefSchema])
      .optional()
      .describe(
        'Node visual shape: bare shape name or `{ type, params }`. Built-ins and registered shapes are allowed; unregistered names fail at compile time. Omitted fields use rectangle.',
      ),
    boundary: BoundarySchema.optional().describe(
      'Default connection surface for edges meeting this node. Per-edge endpoints may override it.',
    ),
    meta: JsonObjectSchema.optional().describe(
      'Opaque JSON metadata carried by this node. Preserved into emitted Scene primitives and ignored by the compiler.',
    ),
    animations: z
      .array(AnimationTrackSchema)
      .optional()
      .describe(
        'Declarative animation tracks for this node. Tracks are carried into emitted Scene primitives, do not affect layout, and are not inherited across scopes.',
      ),
    position: z
      .union([PositionSchema, PolarPositionSchema, AtPositionSchema, OffsetPositionSchema, BetweenPositionSchema])
      .describe(
        'Center point of the node content box: Cartesian [x, y], polar, relative-to-node, offset, or between two endpoints. Non-Cartesian forms resolve at compile time.',
      ),
    rotate: AngleDegreesSchema
      .optional()
      .describe('Rotation in degrees around the node center; positive is visually clockwise.'),
    text: TextBlockSchema.optional().describe(
      'Optional node text content. Accepts a string, an array of lines, styled line objects, or mixed text/math runs. Newlines are hard line breaks; math sugar requires lowerTex.',
    ),
    align: z
      .enum(NodeTextAlign)
      .optional()
      .describe('Multi-line text alignment within the text block. Omitted fields use center.'),
    lineHeight: z
      .number()
      .positive()
      .optional()
      .describe('Line height in user units; falls back to `font.size × 1.2` when omitted.'),
    maxTextWidth: z
      .number()
      .positive()
      .optional()
      .describe('Maximum line width before wrapping, in user units. Omitted fields disable automatic wrapping.'),
    strokeWidth: z
      .number()
      .nonnegative()
      .optional()
      .describe('Border width in user units; defaults to 1 when omitted'),
    dashed: z.boolean().optional().describe('Dashed border preset. `dashPattern` takes precedence.'),
    dotted: z.boolean().optional().describe('Dotted border preset. `dashPattern` and `dashed` take precedence.'),
    dashPattern: z
      .array(z.number().nonnegative())
      .min(1)
      .optional()
      .describe('Explicit stroke dash pattern lengths in user units; overrides `dashed` and `dotted`.'),
    cornerRadius: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Top-level corner radius in user units. Only effective on `rectangle` shape.',
      ),
    minimumSize: BoxSizeValueSchema
      .optional()
      .describe(
        'Minimum visual border size in user units. Number applies to width and height; object width / height override default.',
      ),
    scale: AxisScaleValueSchema
      .optional()
      .describe(
        'Node scale factor. Number applies to both axes; object x / y override default. Affects path attachment positions.',
      ),
    textColor: CssColorSchema.optional().describe('Text label color; any CSS color. Defaults to `currentColor`.'),
    padding: BoxSpacingValueSchema.optional().describe(
      'Inner spacing from content to border. Number applies to all sides; object fields resolve as side > axis > default.',
    ),
    margin: BoxSpacingValueSchema.optional().describe(
      'Outer offset around the connection boundary. Number applies to all sides; object fields resolve as side > axis > default.',
    ),
    font: FontSchema.optional().describe('Font spec for the inner text label. Missing fields use text defaults.'),
    label: z
      .union([NodeLabelSchema, z.array(NodeLabelSchema)])
      .optional()
      .describe(
        'Extra label or labels attached around the node border. Each label is positioned by `position` and `distance`.',
      ),
    zIndex: z
      .number()
      .int()
      .optional()
      .describe(
        'Stacking order among sibling IR children. Higher draws on top; equal values keep source order within the same parent group.',
      ),
  })
  .strict()
  .describe('Node primitive: a positioned, optionally textual shape (rectangle / circle / ellipse / diamond)');
