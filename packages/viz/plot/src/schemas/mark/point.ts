import { BoxSizeSchema, ShapeValueSchema, NodeLayoutSchema, NodeSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { enum as zodEnum, literal, number, strictObject, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { ChannelSchema, NodeEncodingSchema, PositionEncodingSchema } from '../encoding';
import { MarkPlacementSchema } from '../position-adjustment';
import { AnchorIdSchema, hasValidAnchorSource } from './anchor';
import { PointAutoPaddingSchema } from './auto-padding';
import { BuiltinPlotMark, markBase } from './base';
import { nodeHostLabel } from './label';
import {
  MarkOpacityStyleSchema,
  MarkColorStyleSchema,
  MarkFillStyleSchema,
  MarkNonnegativeNumberStyleSchema,
  MarkNumberStyleSchema,
  MarkStrokeStyleSchema,
  MarkZIndexStyleSchema,
  nodeStyleFields,
} from './style';

const StyleBoxSizeSchema = union([NonNegativeNumberSchema, BoxSizeSchema]);

/** 校验点尺寸的非负常量半径 */
export const PointSizeStyleSchema = NonNegativeNumberSchema.describe('point size value');

/** 校验点形状的固定 Core 形状引用 */
export const PointShapeStyleSchema = ShapeValueSchema.describe('point shape value');

/** 校验节点盒尺寸的固定统一与宽高覆盖 */
export const NodeBoxSizeStyleSchema = StyleBoxSizeSchema.describe('node box size style value');

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
  orientation: MarkOrientationSchema.optional(),
  autoPadding: PointAutoPaddingSchema.default('max-radius').optional(),
  color: MarkColorStyleSchema.optional().describe('Glyph color: fixed color; overrides constant fill'),
  textColor: MarkColorStyleSchema.optional().describe(
    'Text point color: fixed core Node textColor; only applied when encoding.text is set',
  ),
  size: PointSizeStyleSchema.optional().describe(
    'Glyph size: field-bound datum channel via a sqrt radius scale or constant final radius',
  ),
  shape: PointShapeStyleSchema.optional().describe(
    'Glyph shape: field-bound categorical channel or constant core Node shape name',
  ),
  fill: MarkFillStyleSchema.optional().describe('Glyph fill: fixed core Node fill paint'),
  stroke: MarkStrokeStyleSchema.optional().describe('Glyph stroke paint: fixed core Node stroke paint'),
  strokeWidth: MarkNonnegativeNumberStyleSchema.optional().describe('Glyph stroke width: fixed core Node stroke width'),
  opacity: MarkOpacityStyleSchema.optional(),
  rotate: MarkNumberStyleSchema.optional().describe('Glyph rotation in degrees: fixed angle'),
  minimumSize: NodeBoxSizeStyleSchema.optional().describe(
    'Minimum visual size: fixed number / {default,width,height}; overridden per datum by size',
  ),
  zIndex: MarkZIndexStyleSchema.optional().describe('Drawing order hint: fixed zIndex'),
  ...nodeStyleFields,
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
  ...nodeHostLabel,
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

/** PointMark 尺寸样式值（field / constant） */
export type IRPlotPointSizeStyle = ZodInfer<typeof PointSizeStyleSchema>;

/** PointMark 形状样式值（field / constant） */
export type IRPlotPointShapeStyle = ZodInfer<typeof PointShapeStyleSchema>;

/** NodeMark 盒尺寸样式值（field / constant） */
export type IRPlotNodeBoxSizeStyle = ZodInfer<typeof NodeBoxSizeStyleSchema>;
