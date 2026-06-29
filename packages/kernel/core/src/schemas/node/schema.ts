import { z } from 'zod';

import { normalizeWebSide } from '../../geometry/anchor';
import { AnimationTrackSchema } from '../animation';
import { BoundarySchema } from '../boundary';
import { BlendMode, DropShadowSchema, ShadowPreset } from '../effects';
import { FontSchema } from '../font';
import { JsonObjectSchema } from '../json';
import { PaintSpecSchema } from '../paint';
import {
  AtPositionSchema,
  BetweenPositionSchema,
  OffsetPositionSchema,
  PolarPositionSchema,
  PositionSchema,
} from '../position';
import { ShapeRefSchema } from '../shape';
import { MixedLineSchema, TextBlockSchema } from '../text';
import { NodeLabelBoundarySide, NodeLabelPlacement, NodeLabelPosition, NodeTextAlign } from './constants';

export const NodeLabelBoundaryPositionSchema = z
  .object({
    boundary: z
      .preprocess(value => (typeof value === 'string' ? normalizeWebSide(value) ?? value : value), z.enum(NodeLabelBoundarySide))
      .describe('Box-like node boundary side used as the label attachment line. Compass side names are accepted aliases.'),
    t: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Normalized position along the selected boundary. Defaults to 0.5.'),
  })
  .strict()
  .describe('Label position on a box-like node boundary.');

/**
 * 节点附属标签 label（TikZ `[label=above:foo]` 同义）
 * @description 可挂多个；label 不参与 layout。position 支持 8 方向枚举或数字角度（polar 约定：0°=+x，90°=+y 屏幕下方）；默认 position='above'，distance=12
 */
export const NodeLabelSchema = z
  .object({
    text: z
      .union([z.string(), MixedLineSchema])
      .describe(
        'Label text content: a string (with `$...$` / `$$...$$` math sugar) or a `{ runs }` mixed text+math line. Rendered as a single line.',
      ),
    position: z
      .union([z.enum(NodeLabelPosition), z.number(), NodeLabelBoundaryPositionSchema])
      .optional()
      .describe(
        'Placement around the node border: direction keyword, center, numeric angle, or `{ boundary, t }`. Omitted fields use above.',
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
    textColor: z.string().optional().describe('Label text color; falls back to currentColor.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Label-only opacity, multiplied with node opacity when both are set.'),
    font: FontSchema.optional().describe('Label font overrides. Missing fields inherit from the parent node font.'),
    rotate: z
      .union([z.enum(['none', 'radial', 'tangent']), z.number()])
      .optional()
      .describe(
        'Rotate label text around its own center: none, radial, tangent, or explicit degrees. Only changes orientation, not placement.',
      ),
    keepUpright: z
      .boolean()
      .optional()
      .describe(
        'When true, flips the rotated label 180 deg if it would otherwise read upside-down (more than 90 deg from upright). Default false (strict geometric angle).',
      ),
    pin: z
      .union([
        z.boolean(),
        z.object({
          stroke: z.string().optional().describe('Leader line color; defaults to the label color / currentColor'),
          strokeWidth: z.number().positive().optional().describe('Leader line width (user units); default 1'),
          dashPattern: z.array(z.number()).optional().describe('Leader dash pattern lengths in user units.'),
        }),
      ])
      .optional()
      .describe(
        'Leader line from the node border to the label. `true` uses the default line; an object provides line style overrides; omitted or `false` disables the leader.',
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
    rotate: z
      .number()
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
    color: z
      .string()
      .optional()
      .describe(
        'Master color for this node. Stroke, fill, text, and labels may inherit it unless individually overridden.',
      ),
    fill: z
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe('Node background paint: CSS color string or PaintSpec.'),
    fillOpacity: z.number().min(0).max(1).optional().describe('Fill-only opacity for the node shape.'),
    stroke: z
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe(
        'Border paint of the node shape; any CSS color string or a PaintSpec (linear / radial gradient, pattern, or image). Defaults to currentColor when omitted.',
      ),
    drawOpacity: z.number().min(0).max(1).optional().describe('Stroke-only opacity for the node border.'),
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
        'Migration-period top-level corner radius in user units; only effective on `rectangle` shape. Prefer the shape params form `{ type: "rectangle", params: { cornerRadius } }`.',
      ),
    minimumWidth: z
      .number()
      .nonnegative()
      .optional()
      .describe('Minimum visual border width in user units; floors the bounding box width.'),
    minimumHeight: z
      .number()
      .nonnegative()
      .optional()
      .describe('Minimum visual border height in user units; floors the bounding box height.'),
    minimumSize: z
      .number()
      .nonnegative()
      .optional()
      .describe('Symmetric alias for `minimumWidth` + `minimumHeight`; axis-specific fields take precedence.'),
    scale: z
      .number()
      .positive()
      .optional()
      .describe(
        'Uniform scale factor; multiplies all node dimensions (border, padding, text, fontSize) at layout time. Affects path attachment positions.',
      ),
    xScale: z.number().positive().optional().describe('Horizontal scale factor; overrides `scale` for the X axis.'),
    yScale: z.number().positive().optional().describe('Vertical scale factor; overrides `scale` for the Y axis.'),
    textColor: z.string().optional().describe('Text label color; any CSS color. Defaults to `currentColor`.'),
    opacity: z.number().min(0).max(1).optional().describe('Whole-node opacity applied uniformly to shape and text.'),
    shadow: z
      .union([z.enum(ShadowPreset), DropShadowSchema])
      .optional()
      .describe(
        'Drop shadow for the node primary shape only. Use a preset keyword or an object whose explicit fields override the preset.',
      ),
    blendMode: z
      .enum(BlendMode)
      .optional()
      .describe(
        'Blend mode for the node primary shape against already drawn content. Does not affect text, labels, or leader lines.',
      ),
    innerXSep: z
      .number()
      .nonnegative()
      .optional()
      .describe('Inner horizontal padding from text to border in user units. Falls back to `padding` then default.'),
    innerYSep: z
      .number()
      .nonnegative()
      .optional()
      .describe('Inner vertical padding from text to border in user units. Falls back to `padding` then default.'),
    outerSep: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Uniform outer offset around the node connection boundary, in user units. Affects endpoints and anchors, contributes to layout, and falls back to `margin`.',
      ),
    padding: z
      .number()
      .nonnegative()
      .optional()
      .describe('Symmetric inner padding (alias for `innerXSep` + `innerYSep`); axis-specific fields take precedence.'),
    margin: z
      .number()
      .nonnegative()
      .optional()
      .describe('Symmetric outer offset alias for `outerSep`; `outerSep` takes precedence.'),
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
