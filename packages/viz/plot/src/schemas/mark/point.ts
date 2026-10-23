import {
  ShapeValueSchema,
  NodeLayoutSchema,
  NodeSchema,
  CssColorSchema,
  PaintValueSchema,
  GraphicOpacityValueSchema,
  GraphicEffectsSchema,
  NodeStrokeSchema,
  TextLayoutSchema,
  TextVisualSchema,
  ContextualColorSchema,
} from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { enum as zodEnum, literal, number, strictObject, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { ChannelSchema, NodeEncodingSchema, PositionEncodingSchema } from '../encoding';
import { MarkPlacementSchema } from '../position-adjustment';
import { AnchorIdSchema, hasValidAnchorSource } from './anchor';
import { PointAutoPaddingSchema } from './auto-padding';
import { BuiltinPlotMark, markBase } from './base';
import { MarkNodeLabelListSchema } from './label';

/** 校验节点相对屏幕或坐标角色的方向意图 */
export const MarkOrientationSchema = union([
  strictObject({ kind: literal('screen') }),
  strictObject({
    kind: literal('coordinate'),
    role: NonBlankStringSchema.describe('Coordinate role whose mapped parameter defines the local curve'),
    align: zodEnum(['tangent', 'normal']).describe('Align local positive x with the tangent or its positive normal'),
  }),
]).describe('Node orientation reference; omitted means screen orientation');

/** 校验逐记录生成点图形或文本节点的点标记 */
export const PointPropertiesSchema = strictObject({
  ...NodeStrokeSchema.shape,
  ...GraphicEffectsSchema.shape,
  ...TextLayoutSchema.shape,
  orientation: MarkOrientationSchema.optional(),
  autoPadding: PointAutoPaddingSchema.default('max-radius').optional(),
  color: CssColorSchema.optional().describe('Glyph color: fixed color; overrides constant fill'),
  textColor: ContextualColorSchema.optional().describe(
    'Text point color: fixed CSS color or master color weight, applied to fixed or field-bound text',
  ),
  size: NonNegativeNumberSchema.optional().describe(
    'Glyph size: field-bound datum channel via a sqrt radius scale or constant final radius',
  ),
  shape: ShapeValueSchema.optional().describe(
    'Glyph shape: field-bound categorical channel or constant core Node shape name',
  ),
  fill: PaintValueSchema.optional().describe('Glyph fill: fixed core Node fill paint'),
  opacity: GraphicOpacityValueSchema.optional(),
  rotate: number().optional().describe('Glyph rotation in degrees: fixed angle'),
  minimumSize: NodeLayoutSchema.shape.minimumSize.describe(
    'Minimum visual size: fixed number / {default,width,height}; overridden per datum by size',
  ),
  zIndex: number().int().optional().describe('Drawing order hint: fixed zIndex'),
  font: TextVisualSchema.shape.font,
  padding: NodeLayoutSchema.shape.padding,
  margin: NodeLayoutSchema.shape.margin,
  scale: NodeSchema.shape.scale,
  boundary: NodeSchema.shape.boundary,
  cornerRadius: NodeSchema.shape.cornerRadius,
  dx: number()
    .optional()
    .describe(
      'Fine-tuning horizontal offset (user units) from the projected anchor; positive = right. Mainly for text points; prefer label position/distance. Default 0',
    ),
  dy: number()
    .optional()
    .describe(
      'Fine-tuning vertical offset (user units) from the projected anchor; positive = screen-down. Mainly for text points. Default 0',
    ),
  anchorId: AnchorIdSchema.optional().describe(
    'Stable id rule written to each generated core Node; takes precedence over datumIdField for the node id',
  ),
  placement: MarkPlacementSchema.optional().describe(
    'Position adjustments applied after position scale mapping and before mark geometry',
  ),
  label: MarkNodeLabelListSchema.optional().describe(
    'Node-host label: lowered onto each datum Node.label (core border-relative placement)',
  ),
  width: NodeLayoutSchema.shape.width,
  text: NodeSchema.shape.text,
  displayFormat: NonBlankStringSchema.optional(),
}).describe('Fixed point properties and construction parameters');

/** 校验点的位置、内容及节点外观字段编码 */
export const PointMarkEncodingSchema = NodeEncodingSchema.extend({
  anchorId: NonBlankStringSchema.optional(),
  position: PositionEncodingSchema.optional(),
  text: NonBlankStringSchema.optional(),
  textColor: ChannelSchema.optional(),
  size: ChannelSchema.optional(),
  shape: ChannelSchema.optional(),
  rotate: ChannelSchema.optional(),
  minimumSize: ChannelSchema.optional(),
}).describe('Point field encodings; fixed values belong to properties');

/** 校验逐记录点的身份、字段编码与固定属性 */
export const PointMarkSchema = strictObject({
  ...markBase,
  type: literal(BuiltinPlotMark.Point),
  encodings: PointMarkEncodingSchema,
  properties: PointPropertiesSchema.optional(),
})
  .refine(hasValidAnchorSource, {
    path: ['properties', 'anchorId'],
    message: 'anchorId requires exactly one of field, template, or generator',
  })
  .describe('Data point mark');

/** 点图元的位置、文本与节点外观字段编码 */
export type IRPlotPointMarkEncoding = ZodInfer<typeof PointMarkEncodingSchema>;

/** point mark（散点 + 文本标签） */
export type IRPlotPointMark = ZodInfer<typeof PointMarkSchema>;

export type IRPlotMarkOrientation = ZodInfer<typeof MarkOrientationSchema>;
