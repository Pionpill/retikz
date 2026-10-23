import type { JsonValue } from '@retikz/foundation';
import { NonBlankStringSchema } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { never, strictObject } from 'zod';

import { ChannelSchema } from './channel';

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
  placement: NonBlankStringSchema.optional().describe('Inside or outside placement field for node labels only'),
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
  placement: never().optional(),
  side: NonBlankStringSchema.optional(),
  sloped: NonBlankStringSchema.optional(),
  align: never().optional(),
  rotate: never().optional(),
  keepUpright: never().optional(),
}).describe('Path label field bindings; side and sloped are path-specific');

/** 单个标签的共同字段编码；不包含字符串简写和宿主专属附着字段 */
export type IRPlotLabelEncoding = ZodInfer<typeof LabelEncodingSchema>;
