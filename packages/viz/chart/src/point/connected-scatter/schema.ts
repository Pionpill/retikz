import {
  BlendMode,
  CssColorSchema,
  DropShadowSchema,
  PathLineCapSchema,
  PathLineJoinSchema,
  ShadowPreset,
  StrokeDashPatternSchema,
  OpacitySchema,
  StrokeWidthSchema,
} from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { PathMarkSchema } from '@retikz/plot';
import type { infer as ZodInfer } from 'zod';
import { array, boolean, enum as zodEnum, literal, strictObject, union } from 'zod';

import { createChartSourceSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import {
  PointAutoPaddingSchema,
  PointPositionDomainPaddingSchema,
  PointPropertiesSchema,
  PointRecipeGuidesSchema,
} from '../shared';
import { ConnectedScatterChartEncodingsSchema } from './encoding-schema';

/** 连接散点中不携带图层归属的点成员常量 */
export const ConnectedScatterPointPropertiesSchema = PointPropertiesSchema.omit({ zIndex: true }).describe(
  'Connected Scatter Point constant properties without zIndex',
);

/** 连接散点中的路径成员常量 */
export const ConnectedScatterPathPropertiesSchema = strictObject({
  /** 相邻观测点的连接方式，省略时使用直线 */
  curve: PathMarkSchema.shape.curve,
  stroke: CssColorSchema.optional(),
  strokeWidth: StrokeWidthSchema.optional(),
  strokeOpacity: OpacitySchema.optional(),
  opacity: OpacitySchema.optional(),
  lineCap: PathLineCapSchema.optional(),
  lineJoin: PathLineJoinSchema.optional(),
  dashPattern: StrokeDashPatternSchema.optional(),
  shadow: union([zodEnum(ShadowPreset), DropShadowSchema]).optional(),
  blendMode: zodEnum(BlendMode).optional(),
  connectNulls: PathMarkSchema.shape.connectNulls,
}).describe('Connected Scatter open Path constant properties');

/** 连接散点标记的作者侧成员属性 */
const ConnectedScatterMarkPropertiesSchema = strictObject({
  point: ConnectedScatterPointPropertiesSchema.optional(),
  path: ConnectedScatterPathPropertiesSchema.optional(),
}).describe('Connected Scatter member properties');

/** 连接散点配方的属性 */
export const ConnectedScatterChartPropertiesSchema = ConnectedScatterMarkPropertiesSchema.extend({
  /** 按序列同色、点线分色或淡化连接线 */
  colorMode: zodEnum(['series', 'mark', 'muted'])
    .default('series')
    .optional()
    .describe(
      'Color allocation: series shares point/path colors (default); mark assigns consecutive palette colors to each series point and path; muted shares series colors and defaults path.strokeOpacity to 0.6 without changing points',
    ),
  autoPadding: PointAutoPaddingSchema.optional(),
  domainPadding: PointPositionDomainPaddingSchema.optional(),
}).describe('Connected Scatter recipe properties');

/** 连接散点标记的作者侧字段直接覆盖 */
export const ConnectedScatterMarkEncodingsSchema = strictObject({
  x: NonBlankStringSchema.optional(),
  y: NonBlankStringSchema.optional(),
  order: NonBlankStringSchema.optional(),
}).describe('Connected Scatter authored mark direct encodings');

/** 连接散点标记的作者侧载荷 */
export const ConnectedScatterChartMarkSchema = strictObject({
  kind: literal(ChartType.ConnectedScatter),
  override: boolean().optional(),
  encodings: ConnectedScatterMarkEncodingsSchema.optional(),
  properties: ConnectedScatterMarkPropertiesSchema.optional(),
}).describe('Connected Scatter Chart mark payload');

/** 连接散点配方的封装结构 */
export const ConnectedScatterChartRecipeSchema = strictObject({
  chartType: literal(ChartType.ConnectedScatter),
  encodings: ConnectedScatterChartEncodingsSchema,
  properties: ConnectedScatterChartPropertiesSchema.optional(),
  guides: PointRecipeGuidesSchema.optional(),
  marks: array(ConnectedScatterChartMarkSchema).optional(),
}).describe('Connected Scatter Chart recipe payload');

/** 校验连接散点图精确输入结构的 schema */
export const ConnectedScatterChartSchema = createChartSourceSchema(
  ChartFamily.Point,
  ConnectedScatterChartRecipeSchema,
).describe('Connected Scatter Chart Source IR');

/** 连接散点图的精确输入 IR */
export type IRConnectedScatterChart = ZodInfer<typeof ConnectedScatterChartSchema>;

/** Connected Scatter recipe 字段映射 */
export type IRConnectedScatterChartEncodings = ZodInfer<typeof ConnectedScatterChartEncodingsSchema>;

/** Connected Scatter Point member 常量属性 */
export type IRConnectedScatterPointProperties = ZodInfer<typeof ConnectedScatterPointPropertiesSchema>;

/** Connected Scatter Path member 常量属性 */
export type IRConnectedScatterPathProperties = ZodInfer<typeof ConnectedScatterPathPropertiesSchema>;

/** Connected Scatter recipe 与 mark 共用的 member 属性 */
export type IRConnectedScatterChartProperties = ZodInfer<typeof ConnectedScatterChartPropertiesSchema>;

/** 连接散点标记的作者侧 IR */
export type IRConnectedScatterMark = ZodInfer<typeof ConnectedScatterChartMarkSchema>;
