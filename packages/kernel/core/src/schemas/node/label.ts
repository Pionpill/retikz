import type { ValueOf } from '@retikz/foundation';
import { NormalizedFractionSchema } from '@retikz/foundation';
import { strictObject, enum as zodEnum, object, union, number, boolean } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { Anchor, Side } from '../../shared';
import { OpacitySchema } from '../style/color';
import { GraphicStrokeSchema } from '../style/graphic';
import { createLabelVisualStyleShape, BoundaryLabelSchema } from '../text/label';
import { TextBlockSchema } from '../text/text';

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
export const NodeLabelSidePositionSchema = strictObject({
  side: zodEnum(Side),
  fraction: NormalizedFractionSchema.optional().describe(
    'Increases left to right on horizontal sides and top to bottom on vertical sides. Defaults to 0.5.',
  ),
}).describe('Attaches the label to a point along one side of a box-like node.');

/** 校验节点外侧标签引线的颜色、线宽与虚线样式 */
export const NodeLabelPinSchema = strictObject({
  ...GraphicStrokeSchema.shape,
  opacity: OpacitySchema.optional().describe('Defaults to label opacity; the node opacity multiplies either value.'),
}).describe('Leader line style overrides for an outside node label.');

/** 校验节点标签的非内容配置及内外放置与引线约束 */
export const NodeLabelConfigSchema = object({
  ...createLabelVisualStyleShape({
    textColor: 'Label text color; falls back to currentColor.',
    opacity: 'Multiplies the node opacity.',
    font: 'Unspecified font fields inherit from the node.',
  }),
  align: BoundaryLabelSchema.shape.align
    .unwrap()
    .optional()
    .describe('Aligns the label along the attachment tangent. Defaults to middle.'),
  position: union([zodEnum(NodeLabelPosition), number().describe('Angle in degrees.'), NodeLabelSidePositionSchema])
    .optional()
    .describe('Defaults to top. At center, placement, distance, and align have no effect on label placement.'),
  placement: BoundaryLabelSchema.shape.placement.unwrap().optional().describe('Defaults to outside.'),
  distance: BoundaryLabelSchema.shape.distance
    .unwrap()
    .optional()
    .describe('Gap from the node border to the rotated label box, in user units. Falls back to labelDistance.'),
  rotate: BoundaryLabelSchema.shape.rotate
    .unwrap()
    .optional()
    .describe('Rotates the label about its center. Radial follows the outward direction; tangent adds 90°.'),
  keepUpright: BoundaryLabelSchema.shape.keepUpright
    .unwrap()
    .optional()
    .describe('Flips the label by 180° if its rotation would leave it upside down.'),
  pin: union([boolean(), NodeLabelPinSchema])
    .optional()
    .describe('Draws a leader line with true or a style object. Cannot be enabled with inside placement.'),
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
export const NodeLabelSchema = NodeLabelConfigSchema.safeExtend({ text: TextBlockSchema }).describe(
  "Adds a label separate from the node's main text, without affecting the node's size.",
);

export type IRNodeLabelSidePosition = ZodInfer<typeof NodeLabelSidePositionSchema>;

/** Node label IR 类型 */
export type IRNodeLabel = ZodInfer<typeof NodeLabelSchema>;
