import { CssColorSchema, GeometryLabelSchema, NodeLabelSchema } from '@retikz/core';
import type { JsonValue } from '@retikz/foundation';
import { NonBlankStringSchema, PositiveNumberSchema } from '@retikz/foundation';
import { array, enum as zodEnum, number, object, strictObject, union } from 'zod';

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
  strictObject({ edge: zodEnum(['start', 'end']).describe('Boundary of the final coordinate role range') }),
]).describe('Exclusive field, constant value, or coordinate range edge');

/** 校验点或路径端点的封闭位置角色，x 必填 */
export const PositionEncodingSchema = strictObject({
  x: PositionInputSchema,
  y: PositionInputSchema.optional(),
  z: PositionInputSchema.optional(),
}).describe('Position inputs for x and optional y/z; required coordinate roles must be supplied');

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

/** 校验对应索引标签的内容字段编码 */
export const LabelEncodingSchema = strictObject({
  content: NonBlankStringSchema.optional(),
}).describe('Field content of a label at the same index as its fixed host properties');

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
  label: union([LabelEncodingSchema, array(LabelEncodingSchema).min(1)]).optional(),
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
  label: union([LabelEncodingSchema, array(LabelEncodingSchema).min(1)]).optional(),
}).describe('Declared path-host visual field targets');

/** 校验位置与共享视觉字段编码 */
export const EncodingSchema = VisualEncodingSchema.extend({
  position: PositionEncodingSchema.optional(),
}).describe('Position role bindings and declared shared visual encodings');

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
export const MarkNodeLabelListSchema = union([MarkNodeLabelSchema, array(MarkNodeLabelSchema).min(1)]).describe(
  'Single or multiple node-host labels; array order is preserved',
);

/** 校验单个或按声明顺序排列的几何宿主标签 */
export const MarkGeometryLabelListSchema = union([
  MarkGeometryLabelSchema,
  array(MarkGeometryLabelSchema).min(1),
]).describe('Single or multiple geometry-host labels; array order is preserved');

/** 校验由标记定义决定节点或几何宿主的标签输入 */
export const MarkLabelSchema = union([MarkNodeLabelSchema, MarkGeometryLabelSchema]).describe(
  'Host-inferred plot label input; mark definitions choose node or geometry host schema',
);

/** 按节点或几何宿主选择对应的单个及多标签输入校验器 */
export const MarkLabelSchemaByHost = {
  node: MarkNodeLabelListSchema,
  geometry: MarkGeometryLabelListSchema,
} as const;
