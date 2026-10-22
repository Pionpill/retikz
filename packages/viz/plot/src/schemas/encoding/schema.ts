import { CssColorSchema, GeometryLabelSchema, NodeLabelSchema } from '@retikz/core';
import type { JsonValue } from '@retikz/foundation';
import { NonBlankStringSchema, PositiveNumberSchema } from '@retikz/foundation';
import { array, enum as zodEnum, never, number, object, strictObject, string, union } from 'zod';

import { PositionEdge } from './constants';

/** 校验字段名简写或显式指定比例尺的字段绑定 */
export const ChannelSchema = union([
  NonBlankStringSchema,
  strictObject({
    field: NonBlankStringSchema.describe('Data field path in the current mark data view'),
    scale: NonBlankStringSchema.describe('Explicit named scale used by this target'),
  }),
]).describe('Field encoding: a non-blank field name, or a field and explicit scale pair');

/** 校验字段、数据空间常量或最终坐标范围边缘，三类输入互斥 */
export const PositionInputSchema = union([
  strictObject({ field: NonBlankStringSchema.describe('Field path in the final mark data view') }),
  strictObject({ value: union([number(), NonBlankStringSchema]).describe('Constant data-space value') }),
  strictObject({ edge: zodEnum(PositionEdge).describe('Boundary of the final coordinate role range') }),
]).describe('Exclusive field, constant value, or coordinate range edge');

/** 校验仅使用 x 的一维位置，显式排除高维角色以约束联合类型 */
export const Position1DEncodingSchema = strictObject({
  x: PositionInputSchema,
  y: never().optional(),
  z: never().optional(),
}).describe('One-dimensional position: x is required; y and z are not allowed');

/** 校验依次包含 x、y 的二维位置 */
export const Position2DEncodingSchema = strictObject({
  x: PositionInputSchema,
  y: PositionInputSchema,
  z: never().optional(),
}).describe('Two-dimensional position: x and y are required; z is not allowed');

/** 校验依次包含 x、y、z 的三维位置 */
export const Position3DEncodingSchema = strictObject({
  x: PositionInputSchema,
  y: PositionInputSchema,
  z: PositionInputSchema,
}).describe('Three-dimensional position: x, y and z are required');

/** 校验一至三维位置，坐标角色必须从 x 开始连续提供 */
export const PositionEncodingSchema = union([
  Position1DEncodingSchema,
  Position2DEncodingSchema,
  Position3DEncodingSchema,
]).describe('Position inputs with consecutive roles: x, x/y, or x/y/z');

/** 校验独立透明度因子的字段编码 */
export const OpacityEncodingSchema = strictObject({
  overall: ChannelSchema.optional(),
  fill: ChannelSchema.optional(),
  stroke: ChannelSchema.optional(),
}).describe('Independent opacity factor field encodings');

/** 校验共享绘图外观的字段编码 */
export const VisualEncodingSchema = strictObject({
  color: ChannelSchema.optional(),
  fill: ChannelSchema.optional(),
  stroke: ChannelSchema.optional(),
  strokeWidth: ChannelSchema.optional(),
  opacity: OpacityEncodingSchema.optional(),
  shadow: ChannelSchema.optional(),
  blendMode: ChannelSchema.optional(),
  zIndex: ChannelSchema.optional(),
})
  .catchall(ChannelSchema.transform((binding): JsonValue => binding))
  .describe('Declared shared visual field targets; additional field targets require registered channel definitions');

/** 校验标签字体各叶子的独立字段绑定 */
export const LabelFontEncodingSchema = strictObject({
  size: ChannelSchema.optional(),
  weight: ChannelSchema.optional(),
  family: NonBlankStringSchema.optional(),
  style: NonBlankStringSchema.optional(),
});

/** 校验标签内容、共同外观与已注册扩展目标的字段绑定 */
export const LabelEncodingSchema = strictObject({
  content: NonBlankStringSchema.optional(),
  font: LabelFontEncodingSchema.optional(),
  textColor: ChannelSchema.optional(),
  opacity: ChannelSchema.optional(),
  position: NonBlankStringSchema.optional(),
  placement: NonBlankStringSchema.optional(),
  distance: NonBlankStringSchema.optional(),
}).catchall(ChannelSchema.transform((binding): JsonValue => binding));

/** 校验节点标签附着属性的字段绑定 */
export const NodeLabelEncodingSchema = LabelEncodingSchema.extend({
  align: NonBlankStringSchema.optional(),
  rotate: NonBlankStringSchema.optional(),
  keepUpright: NonBlankStringSchema.optional(),
  side: never().optional(),
  sloped: never().optional(),
});

/** 校验几何标签附着属性的字段绑定 */
export const PathLabelEncodingSchema = LabelEncodingSchema.extend({
  side: NonBlankStringSchema.optional(),
  sloped: NonBlankStringSchema.optional(),
  align: never().optional(),
  rotate: never().optional(),
  keepUpright: never().optional(),
});

const nodeLabelEncoding = union([NonBlankStringSchema, NodeLabelEncodingSchema]);
const pathLabelEncoding = union([NonBlankStringSchema, PathLabelEncodingSchema]);

/** 校验节点宿主允许的字段编码目标 */
export const NodeEncodingSchema = VisualEncodingSchema.extend({
  align: ChannelSchema.optional(),
  lineHeight: ChannelSchema.optional(),
  maxTextWidth: ChannelSchema.optional(),
  cornerRadius: ChannelSchema.optional(),
  scale: ChannelSchema.optional(),
  padding: ChannelSchema.optional(),
  margin: ChannelSchema.optional(),
  dashed: ChannelSchema.optional(),
  dotted: ChannelSchema.optional(),
  dashPattern: ChannelSchema.optional(),
  font: ChannelSchema.optional(),
  boundary: ChannelSchema.optional(),
  label: union([nodeLabelEncoding, array(nodeLabelEncoding).min(1)]).optional(),
}).describe('Declared node-host visual field targets');

/** 校验路径宿主允许的字段编码目标 */
export const PathEncodingSchema = VisualEncodingSchema.extend({
  rotate: ChannelSchema.optional(),
  scale: ChannelSchema.optional(),
  fillRule: ChannelSchema.optional(),
  thickness: ChannelSchema.optional(),
  dashPattern: ChannelSchema.optional(),
  lineCap: ChannelSchema.optional(),
  lineJoin: ChannelSchema.optional(),
  roundedCorners: ChannelSchema.optional(),
  label: union([pathLabelEncoding, array(pathLabelEncoding).min(1)]).optional(),
}).describe('Declared path-host visual field targets');

/** 校验点的位置、内容及节点外观字段编码 */
export const PointEncodingSchema = NodeEncodingSchema.extend({
  anchorId: NonBlankStringSchema.optional(),
  position: PositionEncodingSchema.optional(),
  text: NonBlankStringSchema.optional(),
  textColor: ChannelSchema.optional(),
  size: ChannelSchema.optional(),
  shape: ChannelSchema.optional(),
  rotate: ChannelSchema.optional(),
  minimumSize: ChannelSchema.optional(),
}).describe('Point field encodings; fixed values belong to properties');

/** 校验与 Core 节点标签对齐的引线样式 */
export const LabelPinStyleSchema = object({
  stroke: CssColorSchema.optional().describe('Leader line color; defaults to the label color / currentColor'),
  strokeWidth: PositiveNumberSchema.optional().describe('Leader line width in user units; default 1'),
  dashPattern: array(number()).optional().describe('Leader dash pattern, e.g. [2, 2]'),
}).describe('Styled label leader line options aligned with core NodeLabelSchema.pin');

/** 校验标签的固定文本内容 */
export const MarkLabelContentSchema = NodeLabelSchema.shape.text.describe('Fixed label text');

const omitText = <T extends Record<string, unknown>>(shape: T): Omit<T, 'text'> =>
  Object.fromEntries(Object.entries(shape).filter(([key]) => key !== 'text')) as Omit<T, 'text'>;

const nodeLabelShape = omitText(NodeLabelSchema.shape);

const geometryLabelShape = omitText(GeometryLabelSchema.shape);

/** 校验附着于 Core 节点宿主的标签，几何字段复用节点标签契约 */
export const MarkNodeLabelSchema = strictObject({
  ...nodeLabelShape,
  content: MarkLabelContentSchema.optional(),
  displayFormat: NonBlankStringSchema.optional(),
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

/** 校验附着于路径类几何宿主的标签，几何字段复用 Core 几何标签契约 */
export const MarkGeometryLabelSchema = strictObject({
  ...geometryLabelShape,
  content: MarkLabelContentSchema.optional(),
  displayFormat: NonBlankStringSchema.optional(),
}).describe(
  'Plot label attached to a path-like GeometryLabel host; all geometry fields are inherited from core GeometryLabelSchema',
);

/** 校验单个或按声明顺序排列的节点宿主标签 */
export const MarkNodeLabelListSchema = union([
  string(),
  MarkNodeLabelSchema,
  array(union([string(), MarkNodeLabelSchema])).min(1),
]).describe('Single or multiple node-host labels; array order is preserved');

/** 校验单个或按声明顺序排列的几何宿主标签 */
export const MarkGeometryLabelListSchema = union([
  string(),
  MarkGeometryLabelSchema,
  array(union([string(), MarkGeometryLabelSchema])).min(1),
]).describe('Single or multiple geometry-host labels; array order is preserved');

/** 校验由标记定义决定节点或几何宿主的标签输入 */
export const MarkLabelSchema = union([string(), MarkNodeLabelSchema, MarkGeometryLabelSchema]).describe(
  'Host-inferred plot label input; mark definitions choose node or geometry host schema',
);

/** 按节点或几何宿主选择对应的单个及多标签输入校验器 */
export const MarkLabelSchemaByHost = {
  node: MarkNodeLabelListSchema,
  geometry: MarkGeometryLabelListSchema,
} as const;
