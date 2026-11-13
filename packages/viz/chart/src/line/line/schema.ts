import {
  BlendMode,
  CssColorSchema,
  DropShadowSchema,
  PathLineCapSchema,
  PathLineJoinSchema,
  ShadowPreset,
  StrokeDashPatternSchema,
  GraphicOpacityValueSchema,
  StrokeWidthSchema,
} from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { PathPropertiesSchema, PointPropertiesSchema } from '@retikz/plot';
import type { infer as ZodInfer } from 'zod';
import { array, boolean, enum as zodEnum, literal, strictObject, union } from 'zod';

import { createChartSourceSchema, ChartRecipeGuidesSchema } from '../../_chart/schemas';
import { LineChartFamily, LineChartType } from '../constants';
import { LineChartEncodingsSchema } from './encoding-schema';

/** 折线中不携带图层归属的点成员常量 */
export const LinePointPropertiesSchema = PointPropertiesSchema.pick({
  size: true,
  shape: true,
  fill: true,
  stroke: true,
  strokeWidth: true,
  opacity: true,
}).describe('Line Point constant properties without zIndex');

/** 折线中的路径成员常量 */
export const LinePathPropertiesSchema = strictObject({
  /** 相邻观测点的连接方式，省略时使用直线 */
  curve: PathPropertiesSchema.shape.curve,
  /** 固定路径颜色，优先于系列颜色 */
  stroke: CssColorSchema.optional(),
  /** 路径线宽 @default 2 */
  strokeWidth: StrokeWidthSchema.default(2).optional(),
  /** 整体或独立通道透明度 */
  opacity: GraphicOpacityValueSchema.optional(),
  /** 路径端点样式 */
  lineCap: PathLineCapSchema.optional(),
  /** 路径转角样式 */
  lineJoin: PathLineJoinSchema.optional(),
  /** 描边虚线节奏 */
  dashPattern: StrokeDashPatternSchema.optional(),
  /** 路径阴影 */
  shadow: union([zodEnum(ShadowPreset), DropShadowSchema]).optional(),
  /** 路径混合模式 */
  blendMode: zodEnum(BlendMode).optional(),
  /** 跨缺值桥接，不补充观测值 @default false */
  connectNulls: PathPropertiesSchema.shape.connectNulls,
}).describe('Line open Path constant properties');

/** 折线标记的作者侧成员属性 */
const LineMarkPropertiesSchema = strictObject({
  /** 观测点开关或常量外观；true 或对象开启，false 关闭 @default false */
  point: union([boolean(), LinePointPropertiesSchema])
    .default(false)
    .optional()
    .describe('False hides points; true or a style object shows observed points; defaults to false'),
  /** 开放路径的常量外观与连接行为 */
  path: LinePathPropertiesSchema.optional(),
}).describe('Line member properties');

/** 折线配方的属性 */
export const LineChartPropertiesSchema = LineMarkPropertiesSchema.describe('Line recipe properties');

/** 折线标记的作者侧字段直接覆盖 */
export const LineMarkEncodingsSchema = strictObject({
  /** 覆盖继承的 x 字段 */
  x: NonBlankStringSchema.optional(),
  /** 覆盖继承的 y 字段 */
  y: NonBlankStringSchema.optional(),
  /** 覆盖继承的排序字段 */
  order: NonBlankStringSchema.optional(),
}).describe('Line authored mark direct encodings');

/** 折线标记的作者侧载荷 */
export const LineChartMarkSchema = strictObject({
  kind: literal(LineChartType),
  override: boolean().optional(),
  encodings: LineMarkEncodingsSchema.optional(),
  properties: LineMarkPropertiesSchema.extend({
    point: LineMarkPropertiesSchema.shape.point
      .unwrap()
      .unwrap()
      .optional()
      .describe('Omitted inherits; false hides; true enables inherited styles; an object enables and overrides styles'),
    path: LinePathPropertiesSchema.extend({
      strokeWidth: LinePathPropertiesSchema.shape.strokeWidth.unwrap().unwrap().optional(),
    }).optional(),
  }).optional(),
}).describe('Line Chart mark payload');

/** 折线配方的封装结构 */
export const LineChartRecipeSchema = strictObject({
  chartType: literal(LineChartType),
  encodings: LineChartEncodingsSchema,
  properties: LineChartPropertiesSchema.optional(),
  guides: ChartRecipeGuidesSchema.optional(),
  marks: array(LineChartMarkSchema).optional(),
}).describe('Line Chart recipe payload');

/** 校验折线图精确输入结构的 schema */
export const LineChartSchema = createChartSourceSchema(LineChartFamily, LineChartRecipeSchema).describe(
  'Line Chart Source IR',
);

/** 折线图的精确输入 IR */
export type IRLineChart = ZodInfer<typeof LineChartSchema>;

/** Line recipe 字段映射 */
export type IRLineChartEncodings = ZodInfer<typeof LineChartEncodingsSchema>;

/** Line Point member 常量属性 */
export type IRLinePointProperties = ZodInfer<typeof LinePointPropertiesSchema>;

/** Line Path member 常量属性 */
export type IRLinePathProperties = ZodInfer<typeof LinePathPropertiesSchema>;

/** Line recipe 与 mark 共用的 member 属性 */
export type IRLineChartProperties = ZodInfer<typeof LineChartPropertiesSchema>;

/** 折线标记的作者侧 IR */
export type IRLineMark = ZodInfer<typeof LineChartMarkSchema>;
