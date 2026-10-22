import type { JsonValue } from '@retikz/foundation';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, enum as zodEnum, never, number, strictObject, union } from 'zod';

import { PositionEdge } from './constants';

/**
 * 校验视觉通道的字段名简写或显式字段与比例尺绑定
 * @description 对象形式必须同时提供 field 和 scale；此处不接受常量，固定外观由 properties 声明
 */
export const ChannelSchema = union([
  NonBlankStringSchema,
  strictObject({
    field: NonBlankStringSchema.describe('Data field path in the current mark data view'),
    scale: NonBlankStringSchema.describe('Explicit named scale used by this target'),
  }),
]).describe('Field encoding: a non-blank field name, or a field and explicit scale pair');

/**
 * 校验字段、数据空间常量或最终坐标范围边缘，三类输入互斥
 * @description field 与 value 经坐标角色的比例尺映射；edge 直接引用最终范围端点，不表示数据域的最小值或最大值
 */
export const PositionInputSchema = union([
  strictObject({ field: NonBlankStringSchema.describe('Field path in the final mark data view') }),
  strictObject({ value: union([number(), NonBlankStringSchema]).describe('Constant data-space value') }),
  strictObject({ edge: zodEnum(PositionEdge).describe('Boundary of the final coordinate role range') }),
]).describe('Exclusive field, constant value, or coordinate range edge');

/** 校验仅提供 x 的一维位置，不允许提供 y、z */
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

/** 校验图元整体、填充和描边透明度的独立字段编码；标签透明度使用单个通道 */
export const OpacityEncodingSchema = strictObject({
  overall: ChannelSchema.optional(),
  fill: ChannelSchema.optional(),
  stroke: ChannelSchema.optional(),
}).describe('Independent opacity factor field encodings');

/**
 * 校验图元共享外观的字段编码，不包含位置或特定宿主的几何属性
 * @description 额外键仅在形态上接受通道绑定，是否已注册及适用于当前图元由通道解析阶段校验
 */
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

/** 校验标签字体的独立字段绑定，未编码的字体叶子保留固定配置和继承 */
export const LabelFontEncodingSchema = strictObject({
  /** 字号字段；省略显式比例尺时直接读取合法字号 */
  size: ChannelSchema.optional().describe('Font size field, optionally mapped through an explicit numeric scale'),
  /** 字重字段；显式比例尺输出仍须符合字体字重契约 */
  weight: ChannelSchema.optional().describe('Font weight field, optionally mapped through an explicit numeric scale'),
  /** 字体族字段，直接读取，不支持比例尺绑定 */
  family: NonBlankStringSchema.optional().describe('Font family field; direct values only, without a scale'),
  /** 字形字段，直接读取，不支持比例尺绑定 */
  style: NonBlankStringSchema.optional().describe('Font style field; direct values only, without a scale'),
}).describe('Independent font field bindings; unencoded leaves retain fixed settings and inheritance');

/**
 * 校验单个标签的内容、共同外观与扩展目标的详细字段编码
 * @description 与 properties.label 按标签索引组合；常量不写入编码，额外目标必须经过通道注册和宿主校验
 */
export const LabelEncodingSchema = strictObject({
  /** 内容字段；格式由固定属性 displayFormat 控制 */
  content: NonBlankStringSchema.optional().describe(
    'Label content field; formatting is configured in fixed properties',
  ),
  font: LabelFontEncodingSchema.optional(),
  textColor: ChannelSchema.optional(),
  /** 标签自身的标量透明度，不使用图元的 overall / fill / stroke 对象 */
  opacity: ChannelSchema.optional().describe('Scalar label opacity field, independent of mark opacity factor bindings'),
  /** 附着位置字段，值语义由节点或路径宿主决定 */
  position: NonBlankStringSchema.optional().describe(
    'Attachment position field; values follow the label host contract',
  ),
  placement: NonBlankStringSchema.optional().describe(
    'Inside or outside placement field, interpreted by the label host',
  ),
  distance: NonBlankStringSchema.optional().describe('Label offset distance field in user units'),
})
  .catchall(ChannelSchema.transform((binding): JsonValue => binding))
  .describe('Detailed label field bindings matched by label index; additional targets require registered channels');

/** 校验节点标签的字段编码，支持切向对齐、自身旋转和保持正立，排除路径专属字段 */
export const NodeLabelEncodingSchema = LabelEncodingSchema.extend({
  align: NonBlankStringSchema.optional(),
  rotate: NonBlankStringSchema.optional(),
  keepUpright: NonBlankStringSchema.optional(),
  side: never().optional(),
  sloped: never().optional(),
}).describe('Node label field bindings; align, rotate and keepUpright are node-specific');

/** 校验路径标签的字段编码，支持侧向放置和沿切线旋转，排除节点专属字段 */
export const PathLabelEncodingSchema = LabelEncodingSchema.extend({
  side: NonBlankStringSchema.optional(),
  sloped: NonBlankStringSchema.optional(),
  align: never().optional(),
  rotate: never().optional(),
  keepUpright: never().optional(),
}).describe('Path label field bindings; side and sloped are path-specific');

/** 节点标签的字段名简写等价于同一标签索引的 content 绑定 */
const nodeLabelEncoding = union([NonBlankStringSchema, NodeLabelEncodingSchema]);
/** 路径标签的字段名简写等价于同一标签索引的 content 绑定 */
const pathLabelEncoding = union([NonBlankStringSchema, PathLabelEncodingSchema]);

/** 校验节点宿主的外观与标签字段编码；具体图元另行组合位置和构造规则 */
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
  /** 单标签或非空多标签数组；字符串表示内容字段，各项与固定标签按索引配对 */
  label: union([nodeLabelEncoding, array(nodeLabelEncoding).min(1)]).optional(),
}).describe('Declared node-host visual field targets');

/** 校验路径宿主的外观与标签字段编码；不包含顶点、端点、分组或排序规则 */
export const PathEncodingSchema = VisualEncodingSchema.extend({
  rotate: ChannelSchema.optional(),
  scale: ChannelSchema.optional(),
  fillRule: ChannelSchema.optional(),
  thickness: ChannelSchema.optional(),
  dashPattern: ChannelSchema.optional(),
  lineCap: ChannelSchema.optional(),
  lineJoin: ChannelSchema.optional(),
  roundedCorners: ChannelSchema.optional(),
  /** 单标签或非空多标签数组；字符串表示内容字段，各项与固定标签按索引配对 */
  label: union([pathLabelEncoding, array(pathLabelEncoding).min(1)]).optional(),
}).describe('Declared path-host visual field targets');
