import {
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, NEVER, number, object, preprocess, union } from 'zod';

import { Side } from '../../shared';
import { AnimationTrackSchema } from '../animation';
import { BoundarySchema } from '../boundary';
import { FontSchema } from '../font';
import { JsonObjectSchema } from '../json';
import {
  AnchorPositionSchema,
  AtPositionSchema,
  BetweenPositionSchema,
  OffsetPositionSchema,
  PolarPositionSchema,
  PositionSchema,
} from '../position';
import { AngleDegreesSchema } from '../scalar';
import { ShapeValueSchema } from '../shape';
import { StrokeDashOffsetSchema, StrokeDashPatternSchema } from '../stroke';
import { CssColorSchema, GraphicStyleSchema } from '../style';
import {
  createLabelVisualStyleShape,
  LabelTextContentSchema,
  LineHeightSchema,
  TextAlignSchema,
  TextBlockSchema,
} from '../text';
import { NodeLabelPlacement, NodeLabelPosition, NodeLabelRotateMode } from './constants';

export const NodeLabelBoundaryPositionSchema = object({
  boundary: zodEnum(Side).describe('Canonical box-like node boundary side used as the label attachment line.'),
  fraction: NormalizedFractionSchema.optional().describe(
    'Normalized position along the selected boundary. Defaults to 0.5.',
  ),
})
  .strict()
  .describe('Label position on a box-like node boundary.');

export const BoxSpacingSchema = object({
  default: NonNegativeNumberSchema.optional().describe('Fallback spacing for all sides.'),
  x: NonNegativeNumberSchema.optional().describe('Horizontal spacing for left and right sides.'),
  y: NonNegativeNumberSchema.optional().describe('Vertical spacing for top and bottom sides.'),
  left: NonNegativeNumberSchema.optional().describe('Left-side spacing.'),
  right: NonNegativeNumberSchema.optional().describe('Right-side spacing.'),
  top: NonNegativeNumberSchema.optional().describe('Top-side spacing.'),
  bottom: NonNegativeNumberSchema.optional().describe('Bottom-side spacing.'),
})
  .strict()
  .describe('CSS-like box spacing overrides. Side fields override axis fields, then default.');

const BoxSpacingValueSchema = union([NonNegativeNumberSchema, BoxSpacingSchema]);

export const AxisScaleSchema = object({
  default: PositiveNumberSchema.optional().describe('Fallback scale factor for both axes.'),
  x: PositiveNumberSchema.optional().describe('Horizontal scale factor.'),
  y: PositiveNumberSchema.optional().describe('Vertical scale factor.'),
})
  .strict()
  .describe('Axis-specific scale overrides. Axis fields override default.');

const AxisScaleValueSchema = union([PositiveNumberSchema, AxisScaleSchema]);

export const BoxSizeSchema = object({
  default: NonNegativeNumberSchema.optional().describe('Fallback size for width and height.'),
  width: NonNegativeNumberSchema.optional().describe('Width size.'),
  height: NonNegativeNumberSchema.optional().describe('Height size.'),
})
  .strict()
  .describe('Box size overrides. Width and height override default.');

const BoxSizeValueSchema = union([NonNegativeNumberSchema, BoxSizeSchema]);

export const NodeLabelPinSchema = object({
  stroke: CssColorSchema.optional().describe('Leader line color; defaults to the label color / currentColor'),
  strokeWidth: PositiveNumberSchema.optional().describe('Leader line width (user units); default 1'),
  dashPattern: array(number()).optional().describe('Leader dash pattern lengths in user units.'),
  dashOffset: number()
    .optional()
    .describe('Leader dash offset in user units. Positive and negative finite values are allowed.'),
}).describe('Leader line style overrides for an outside node label.');

export const NodeLabelSchema = object({
  ...createLabelVisualStyleShape({
    textColor: 'Label text color; falls back to currentColor.',
    opacity: 'Label-only opacity, multiplied with node opacity when both are set.',
    font: 'Label font overrides. Missing fields inherit from the parent node font.',
  }),
  text: LabelTextContentSchema,
  position: union([zodEnum(NodeLabelPosition), AngleDegreesSchema, NodeLabelBoundaryPositionSchema])
    .optional()
    .describe(
      'Label attachment point: canonical direction, center, angle, or `{ boundary, fraction }`. Omitted fields use top.',
    ),
  placement: zodEnum(NodeLabelPlacement)
    .optional()
    .describe('Whether the label is offset outside or inside the selected attachment point. Default `outside`.'),
  distance: NonNegativeNumberSchema.optional().describe(
    'Gap between the node border and the rotated label visual box, in user units. Omitted fields use compile labelDistance.',
  ),
  rotate: union([zodEnum(NodeLabelRotateMode), AngleDegreesSchema])
    .optional()
    .describe(
      'Label self-rotation: none, radial along the position direction, tangent to it, or an explicit angle in degrees. Boundary-fraction positions use the selected side outward normal.',
    ),
  keepUpright: boolean()
    .optional()
    .describe(
      'When true, flips the rotated label 180 deg if it would otherwise read upside-down (more than 90 deg from upright). Default false (strict geometric angle).',
    ),
  pin: union([boolean(), NodeLabelPinSchema])
    .optional()
    .describe('Outside-label leader line. Use true for defaults or an object for style overrides.'),
})
  .superRefine((label, ctx) => {
    if (label.placement === NodeLabelPlacement.Inside && label.pin) {
      ctx.addIssue({
        code: 'custom',
        path: ['pin'],
        message: 'Node label pin is only supported for outside placement.',
      });
    }
  })
  .describe('Extra text attached around a node border. Multiple labels supported via array form on `Node.label`.');

const SharedNodePositionSchema = union([
  PositionSchema,
  PolarPositionSchema,
  AtPositionSchema,
  OffsetPositionSchema,
  BetweenPositionSchema,
]);

/**
 * Node position 分支选择
 * @description 原始对象一旦带 `kind` 就只按 AnchorPosition 解析，避免宽松旧分支剥离 discriminator 后静默改写语义
 */
const NodePositionSchema = preprocess(
  (value, ctx) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value) || !('kind' in value)) return value;
    const result = AnchorPositionSchema.safeParse(value);
    if (result.success) return result.data;
    ctx.addIssue({
      code: 'custom',
      message: `Node position objects with 'kind' must match AnchorPositionSchema: ${result.error.issues[0]?.message ?? 'invalid anchor position'}`,
    });
    return NEVER;
  },
  union([SharedNodePositionSchema, AnchorPositionSchema]),
);

export const NodeSchema = object({
  type: literal('node').describe('Discriminator marking this child as a node'),
  ...GraphicStyleSchema.shape,
  id: NonBlankStringSchema.optional().describe(
    'Optional unique id; required if any path needs to reference this node by string',
  ),
  shape: ShapeValueSchema.optional().describe(
    'Node visual shape: bare shape name or `{ type, params }`. Built-ins and registered shapes are allowed; unregistered names fail at compile time. Omitted fields use rectangle.',
  ),
  boundary: BoundarySchema.optional().describe(
    'Default connection surface for edges meeting this node. Per-edge endpoints may override it.',
  ),
  meta: JsonObjectSchema.optional().describe(
    'Opaque JSON metadata carried by this node. Preserved into emitted Scene primitives and ignored by the compiler.',
  ),
  animations: array(AnimationTrackSchema)
    .optional()
    .describe(
      'Declarative animation tracks for this node. Tracks are carried into emitted Scene primitives, do not affect layout, and are not inherited across scopes.',
    ),
  position: NodePositionSchema.describe(
    'Node placement: Cartesian [x, y], polar, relative-to-node, offset, between two endpoints, or anchor-to-anchor alignment. Non-Cartesian forms resolve at compile time.',
  ),
  rotate: AngleDegreesSchema.optional().describe(
    'Rotation in degrees around the node center; positive is visually clockwise.',
  ),
  text: TextBlockSchema.optional().describe(
    'Optional node text content. Accepts a string, an array of lines, styled line objects, or mixed text/math runs. Newlines are hard line breaks; math sugar requires lowerTex.',
  ),
  align: TextAlignSchema.optional().describe(
    'Multi-line text alignment within the text block. Omitted fields use middle.',
  ),
  lineHeight: LineHeightSchema.optional().describe(
    'Line height in user units; falls back to `font.size × 1.2` when omitted.',
  ),
  maxTextWidth: PositiveNumberSchema.optional().describe(
    'Maximum line width before wrapping, in user units. Omitted fields disable automatic wrapping.',
  ),
  strokeWidth: NonNegativeNumberSchema.optional().describe('Border width in user units; defaults to 1 when omitted'),
  dashed: boolean().optional().describe('Dashed border preset. `dashPattern` takes precedence.'),
  dotted: boolean().optional().describe('Dotted border preset. `dashPattern` and `dashed` take precedence.'),
  dashPattern: StrokeDashPatternSchema.optional().describe(
    'Explicit stroke dash pattern lengths in user units; overrides `dashed` and `dotted`.',
  ),
  dashOffset: StrokeDashOffsetSchema.optional().describe(
    'Explicit stroke dash offset in user units. Positive and negative finite values are allowed.',
  ),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Top-level corner radius in user units. Only effective on `rectangle` shape.',
  ),
  minimumSize: BoxSizeValueSchema.optional().describe(
    'Minimum visual border size in user units. Number applies to width and height; object width / height override default.',
  ),
  scale: AxisScaleValueSchema.optional().describe(
    'Node scale factor. Number applies to both axes; object x / y override default. Affects path attachment positions.',
  ),
  textColor: CssColorSchema.optional().describe(
    'Node text color. The reserved `contrast` keyword selects black or white from a static opaque fill. Defaults to `currentColor`.',
  ),
  padding: BoxSpacingValueSchema.optional().describe(
    'Inner spacing from content to border. Number applies to all sides; object fields resolve as side > axis > default.',
  ),
  margin: BoxSpacingValueSchema.optional().describe(
    'Outer offset around the connection boundary. Number applies to all sides; object fields resolve as side > axis > default.',
  ),
  font: FontSchema.optional().describe('Font spec for the inner text label. Missing fields use text defaults.'),
  label: union([NodeLabelSchema, array(NodeLabelSchema)])
    .optional()
    .describe(
      'Extra label or labels attached around the node border. Each label is positioned by `position` and `distance`.',
    ),
  zIndex: number()
    .int()
    .optional()
    .describe(
      'Stacking order among sibling IR children. Higher draws on top; equal values keep source order within the same parent group.',
    ),
})
  .strict()
  .describe('Node primitive: a positioned, optionally textual shape');
