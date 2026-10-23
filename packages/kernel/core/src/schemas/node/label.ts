import type { ValueOf } from '@retikz/foundation';
import { NormalizedFractionSchema } from '@retikz/foundation';
import { strictObject, enum as zodEnum, object, union, number, boolean } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { Anchor, Side } from '../../shared';
import { GraphicStrokeSchema, OpacitySchema } from '../style/graphic';
import { createLabelVisualStyleShape, BoundaryLabelSchema, LabelTextContentSchema } from '../text/label';

/** 节点标签相对节点的位置关键字 */
export const NodeLabelPosition = {
  ...Anchor,
  Center: 'center',
} as const;

/** 节点标签放置在节点边界内侧或外侧 */
export const NodeLabelPlacement = {
  Outside: 'outside',
  Inside: 'inside',
} as const;

/** 节点标签自身旋转模式 */
export const NodeLabelRotateMode = {
  /** 保持文字正立，不随标签位置旋转 */
  None: 'none',
  /** 沿节点中心到标签中心的径向方向旋转 */
  Radial: 'radial',
  /** 沿径向方向的切线方向旋转 */
  Tangent: 'tangent',
} as const;

export type NodeLabelPosition = ValueOf<typeof NodeLabelPosition>;

export type NodeLabelPlacement = ValueOf<typeof NodeLabelPlacement>;

/** 节点标签自身旋转模式取值 */
export type NodeLabelRotateMode = ValueOf<typeof NodeLabelRotateMode>;

/** 校验标签在矩形类节点指定边上的归一化附着位置 */
export const NodeLabelBoundaryPositionSchema = strictObject({
  boundary: zodEnum(Side).describe('Canonical box-like node boundary side used as the label attachment line.'),
  fraction: NormalizedFractionSchema.optional().describe(
    'Normalized position along the selected boundary. Defaults to 0.5.',
  ),
}).describe('Label position on a box-like node boundary.');

/** 校验节点外侧标签引线的颜色、线宽与虚线样式 */
export const NodeLabelPinSchema = strictObject({
  ...GraphicStrokeSchema.shape,
  opacity: OpacitySchema.optional().describe(
    'Independent leader opacity; otherwise inherits the effective label opacity.',
  ),
}).describe('Leader line style overrides for an outside node label.');

/** 校验节点标签的非内容配置及内外放置与引线约束 */
export const NodeLabelConfigSchema = object({
  ...createLabelVisualStyleShape({
    textColor: 'Label text color; falls back to currentColor.',
    opacity: 'Label-only opacity, multiplied with node opacity when both are set.',
    font: 'Label font overrides. Missing fields inherit from the parent node font.',
  }),
  align: BoundaryLabelSchema.shape.align
    .unwrap()
    .optional()
    .describe('Attachment tangent alignment: start, middle, or end. Defaults to middle.'),
  position: union([zodEnum(NodeLabelPosition), number().describe('Angle in degrees.'), NodeLabelBoundaryPositionSchema])
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
  .describe('Node label configuration without text content.');

/** 校验附着于节点边界的标签内容与配置 */
export const NodeLabelSchema = NodeLabelConfigSchema.safeExtend({ text: LabelTextContentSchema }).describe(
  'Extra text attached around a node border. Multiple labels supported via array form on `Node.label`.',
);

export type IRNodeLabelBoundaryPosition = ZodInfer<typeof NodeLabelBoundaryPositionSchema>;

/** Node label IR 类型 */
export type IRNodeLabel = ZodInfer<typeof NodeLabelSchema>;
