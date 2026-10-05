import {
  JsonObjectSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { array, boolean, enum as zodEnum, literal, NEVER, number, object, preprocess, strictObject, union } from 'zod';

import { Side } from '../../shared';
import { AnimationTrackSchema } from '../animation';
import { BoundarySchema } from '../boundary';
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
import { ContextualColorSchema, GraphicStyleSchema } from '../style';
import {
  BoundaryLabelSchema,
  createLabelVisualStyleShape,
  LabelTextContentSchema,
  TextBlockSchema,
  TextVisualSchema,
  TextLayoutSchema,
} from '../text';
import { NodeLabelPlacement, NodeLabelPosition } from './constants';

/** 校验标签在矩形类节点指定边上的归一化附着位置 */
export const NodeLabelBoundaryPositionSchema = object({
  boundary: zodEnum(Side).describe('Canonical box-like node boundary side used as the label attachment line.'),
  fraction: NormalizedFractionSchema.optional().describe(
    'Normalized position along the selected boundary. Defaults to 0.5.',
  ),
})
  .strict()
  .describe('Label position on a box-like node boundary.');

/** 校验按边、轴或统一值指定的盒间距；具体边优先于轴，轴优先于统一值 */
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

/** 校验双轴缩放覆盖值；指定轴优先于统一倍率 */
export const AxisScaleSchema = object({
  default: PositiveNumberSchema.optional().describe('Fallback scale factor for both axes.'),
  x: PositiveNumberSchema.optional().describe('Horizontal scale factor.'),
  y: PositiveNumberSchema.optional().describe('Vertical scale factor.'),
})
  .strict()
  .describe('Axis-specific scale overrides. Axis fields override default.');

const AxisScaleValueSchema = union([PositiveNumberSchema, AxisScaleSchema]);

/** 校验宽高覆盖值；单独指定的宽或高优先于统一尺寸 */
export const BoxSizeSchema = object({
  default: NonNegativeNumberSchema.optional().describe('Fallback size for width and height.'),
  width: NonNegativeNumberSchema.optional().describe('Width size.'),
  height: NonNegativeNumberSchema.optional().describe('Height size.'),
})
  .strict()
  .describe('Box size overrides. Width and height override default.');

const BoxSizeValueSchema = union([NonNegativeNumberSchema, BoxSizeSchema]);

/** 校验节点外侧标签引线的颜色、线宽与虚线样式 */
export const NodeLabelPinSchema = object({
  stroke: ContextualColorSchema.optional().describe(
    'Leader line color; an exact CSS color or a weight derived from the effective label color.',
  ),
  strokeWidth: PositiveNumberSchema.optional().describe('Leader line width (user units); default 1'),
  dashPattern: array(number()).optional().describe('Leader dash pattern lengths in user units.'),
  dashOffset: number()
    .optional()
    .describe('Leader dash offset in user units. Positive and negative finite values are allowed.'),
}).describe('Leader line style overrides for an outside node label.');

/** 校验附属标签的文本、附着位置、视觉样式与引线描述 */
export const NodeLabelSchema = object({
  ...createLabelVisualStyleShape({
    textColor: 'Label text color; falls back to currentColor.',
    opacity: 'Label-only opacity, multiplied with node opacity when both are set.',
    font: 'Label font overrides. Missing fields inherit from the parent node font.',
  }),
  text: LabelTextContentSchema,
  align: BoundaryLabelSchema.shape.align
    .unwrap()
    .optional()
    .describe('Attachment tangent alignment: start, middle, or end. Defaults to middle.'),
  position: union([zodEnum(NodeLabelPosition), AngleDegreesSchema, NodeLabelBoundaryPositionSchema])
    .optional()
    .describe(
      'Label attachment point: canonical direction, center, angle, or `{ boundary, fraction }`. Omitted fields use top.',
    ),
  placement: BoundaryLabelSchema.shape.placement
    .unwrap()
    .optional()
    .describe('Outside or inside the attachment point. Default outside.'),
  distance: BoundaryLabelSchema.shape.distance
    .unwrap()
    .optional()
    .describe(
      'Gap between the node border and the rotated label visual box, in user units. Omitted fields use compile labelDistance.',
    ),
  rotate: BoundaryLabelSchema.shape.rotate
    .unwrap()
    .optional()
    .describe('Label self-rotation: none, radial, tangent, or an explicit angle in degrees.'),
  keepUpright: BoundaryLabelSchema.shape.keepUpright
    .unwrap()
    .optional()
    .describe('Flip upside-down labels when true. Default false.'),
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

/** 节点实例视觉覆盖 */
export const NodeStyleSchema = strictObject({
  ...GraphicStyleSchema.shape,
  strokeWidth: NonNegativeNumberSchema.optional().describe('Border width in user units; defaults to 1 when omitted'),
  dashed: boolean().optional().describe('Dashed border preset. `dashPattern` takes precedence.'),
  dotted: boolean().optional().describe('Dotted border preset. `dashPattern` and `dashed` take precedence.'),
  dashPattern: StrokeDashPatternSchema.optional().describe(
    'Explicit stroke dash pattern lengths in user units; overrides `dashed` and `dotted`.',
  ),
  dashOffset: StrokeDashOffsetSchema.optional().describe(
    'Explicit stroke dash offset in user units. Positive and negative finite values are allowed.',
  ),
  ...TextVisualSchema.shape,
}).describe('Node visual overrides; fields independently override inherited defaults.');

/** 节点尺寸、间距与文本布局 */
export const NodeLayoutSchema = strictObject({
  ...TextLayoutSchema.shape,
  width: PositiveNumberSchema.optional().describe(
    'Exact unscaled visible border width in user units. Excludes margin and must not be smaller than the effective minimum width.',
  ),
  minimumSize: BoxSizeValueSchema.optional().describe(
    'Minimum visual border size in user units. Number applies to width and height; object width / height override default.',
  ),
  padding: BoxSpacingValueSchema.optional().describe(
    'Inner spacing from content to border. Number applies to all sides; object fields resolve as side > axis > default.',
  ),
  margin: BoxSpacingValueSchema.optional().describe(
    'Outer offset around the connection boundary. Number applies to all sides; object fields resolve as side > axis > default.',
  ),
}).describe('Node size, spacing, and text layout overrides.');

const NodeBaseSchema = strictObject({
  type: literal('node').describe('Discriminator marking this child as a node'),
  id: NonBlankStringSchema.optional().describe(
    'Optional unique id; required if any path needs to reference this node by string',
  ),
  aliasIds: array(NonBlankStringSchema)
    .optional()
    .describe('Additional ids for the same node geometry; requires id and excludes duplicate or primary ids.'),
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
  position: NodePositionSchema.default([0, 0]).describe(
    'Node placement: Cartesian [x, y], polar, relative-to-node, offset, between two endpoints, or anchor-to-anchor alignment. Defaults to [0, 0] in the current local coordinate system. Non-Cartesian forms resolve at compile time.',
  ),
  rotate: AngleDegreesSchema.optional().describe(
    'Rotation in degrees around the node center; positive is visually clockwise.',
  ),
  text: TextBlockSchema.optional().describe(
    'Optional node text content. Accepts a string, an array of lines, styled line objects, or mixed text/math runs. Newlines are hard line breaks; math sugar requires lowerTex.',
  ),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Top-level corner radius in user units. Only effective on `rectangle` shape.',
  ),
  scale: AxisScaleValueSchema.optional().describe(
    'Node scale factor. Number applies to both axes; object x / y override default. Affects path attachment positions.',
  ),
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
  style: NodeStyleSchema.optional().describe(
    'Node visual overrides; fields independently override inherited defaults.',
  ),
  layout: NodeLayoutSchema.optional().describe('Node size, spacing, and text layout overrides.'),
});

/** 校验可定位的节点，并要求别名依附主标识且在节点内不重复 */
export const NodeSchema = NodeBaseSchema.superRefine((node, context) => {
  if (node.aliasIds === undefined) return;
  if (node.id === undefined) {
    context.addIssue({ code: 'custom', path: ['aliasIds'], message: 'Node aliases require a primary id.' });
    return;
  }

  const ids = new Set([node.id]);
  node.aliasIds.forEach((id, index) => {
    if (ids.has(id))
      context.addIssue({ code: 'custom', path: ['aliasIds', index], message: `Duplicate Node id '${id}'.` });
    ids.add(id);
  });
}).describe('Node primitive: a positioned, optionally textual shape');
