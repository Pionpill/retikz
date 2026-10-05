import {
  BlendMode,
  CssColorSchema,
  DropShadowSchema,
  OpacitySchema,
  PaintSchema,
  PathLineCapSchema,
  PathLineJoinSchema,
  ShadowPreset,
  StrokeDashPatternSchema,
  StrokeWidthSchema,
} from '@retikz/core';
import { RegressionMethodSchema, SmoothTransformSchema } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { PathCurve, PathMarkSchema } from '@retikz/plot';
import type { infer as ZodInfer, RefinementCtx } from 'zod';
import { array, boolean, enum as zodEnum, literal, number, strictObject, union } from 'zod';

import { createChartSourceSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import {
  PointAutoPaddingSchema,
  PointPositionDomainPaddingSchema,
  PointPropertiesSchema,
  PointRecipeGuidesSchema,
} from '../shared';
import { RegressionChartEncodingsSchema } from './encoding-schema';

/** Regression 原始观测点的完整常量 properties */
export const RegressionPointPropertiesSchema = PointPropertiesSchema.describe(
  'Regression observation Point constant properties',
);

/** Regression 趋势默认连接策略；继承合并后才物化 */
export const RegressionTrendCurveSchema = PathMarkSchema.shape.curve.unwrap().default(PathCurve.CatmullRom);

/** Regression 趋势 Path 允许的精确常量 properties */
export const RegressionTrendPropertiesSchema = strictObject({
  curve: RegressionTrendCurveSchema.unwrap().optional().describe('Trend connection curve; default catmullRom'),
  stroke: union([CssColorSchema, PaintSchema]).optional().describe('Constant trend stroke paint'),
  strokeWidth: StrokeWidthSchema.optional().describe('Constant trend stroke width'),
  strokeOpacity: OpacitySchema.optional().describe('Constant trend stroke opacity'),
  opacity: OpacitySchema.optional().describe('Constant trend opacity'),
  lineCap: PathLineCapSchema.optional().describe('Constant trend line cap'),
  lineJoin: PathLineJoinSchema.optional().describe('Constant trend line join'),
  zIndex: number().int().optional().describe('Constant trend drawing order'),
  dashPattern: StrokeDashPatternSchema.optional().describe('Constant trend dash pattern'),
  shadow: union([zodEnum(ShadowPreset), DropShadowSchema])
    .optional()
    .describe('Constant trend shadow'),
  blendMode: zodEnum(BlendMode).optional().describe('Constant trend blend mode'),
}).describe('Regression trend Path constant properties');

/** 校验趋势采样区间 */
const refineRegressionExtent = (properties: { extent?: Array<number> }, context: RefinementCtx): void => {
  if (properties.extent !== undefined && properties.extent[0] >= properties.extent[1]) {
    context.addIssue({
      code: 'custom',
      path: ['extent'],
      message: 'regression extent lower bound must be less than upper bound',
    });
  }
};

/** 共享观测数据的额外拟合；省略项继承所在语义组的配置 */
export const RegressionExtraMethodSchema = strictObject({
  method: RegressionMethodSchema,
  sampleCount: SmoothTransformSchema.shape.sampleCount,
  extent: SmoothTransformSchema.shape.extent,
  trend: RegressionTrendPropertiesSchema.optional(),
})
  .superRefine(refineRegressionExtent)
  .describe('Additional regression fit sharing observations with inherited sampling and trend properties');

const RegressionPropertiesBaseSchema = strictObject({
  method: SmoothTransformSchema.shape.method,
  sampleCount: SmoothTransformSchema.shape.sampleCount,
  extent: SmoothTransformSchema.shape.extent,
  point: RegressionPointPropertiesSchema.optional(),
  trend: RegressionTrendPropertiesSchema.optional(),
  extraMethods: array(RegressionExtraMethodSchema)
    .optional()
    .describe('Ordered additional fits; replaces inherited entries, with an empty array clearing them'),
});

/** Regression authored mark 的拟合和外观 properties */
const RegressionMarkPropertiesSchema = RegressionPropertiesBaseSchema.superRefine(refineRegressionExtent).describe(
  'Regression authored mark fitting and constant appearance properties',
);

/** Regression recipe 的拟合、外观与位置 domain 留白 */
export const RegressionChartPropertiesSchema = RegressionPropertiesBaseSchema.extend({
  autoPadding: PointAutoPaddingSchema.optional(),
  domainPadding: PointPositionDomainPaddingSchema.optional(),
})
  .superRefine(refineRegressionExtent)
  .describe('Regression Chart fitting and constant appearance properties');

/** Regression authored mark 只能覆盖共同数据中的 direct x/y 字段 */
export const RegressionMarkEncodingsSchema = strictObject({
  x: NonBlankStringSchema.optional(),
  y: NonBlankStringSchema.optional(),
}).describe('Regression authored mark direct position overrides');

/** Regression recipe 允许的有序 Chart mark schema */
export const RegressionChartMarkSchema = strictObject({
  kind: literal(ChartType.Regression),
  override: boolean().optional().describe('Whether to replace the built-in Regression semantic group'),
  /** 不生成当前图元的观测点，保留所有拟合趋势；默认关闭 */
  hidePoints: boolean()
    .default(false)
    .optional()
    .describe('Omit observation points from this mark while retaining all fitted trends'),
  encodings: RegressionMarkEncodingsSchema.optional(),
  properties: RegressionMarkPropertiesSchema.optional(),
}).describe('Regression Chart mark payload');

/** Regression recipe 的严格 envelope */
export const RegressionChartRecipeSchema = strictObject({
  chartType: literal(ChartType.Regression).describe('Globally unique Regression recipe key'),
  encodings: RegressionChartEncodingsSchema,
  properties: RegressionChartPropertiesSchema.optional(),
  guides: PointRecipeGuidesSchema.optional(),
  marks: array(RegressionChartMarkSchema).optional(),
}).describe('Regression Chart recipe payload');

/** Regression Chart 精确 Source schema */
export const RegressionChartSchema = createChartSourceSchema(ChartFamily.Point, RegressionChartRecipeSchema).describe(
  'Regression Chart Source IR',
);

/** Regression Chart 精确 Source IR */
export type IRRegressionChart = ZodInfer<typeof RegressionChartSchema>;

/** 回归配方的输入 IR */
export type IRRegressionChartRecipe = ZodInfer<typeof RegressionChartRecipeSchema>;

/** 回归标记的精确编码计划 */
export type IRRegressionChartEncodings = ZodInfer<typeof RegressionChartEncodingsSchema>;

/** Regression 拟合与外观 properties */
export type IRRegressionChartProperties = ZodInfer<typeof RegressionChartPropertiesSchema>;

/** Regression 原始观测点 properties */
export type IRRegressionPointProperties = ZodInfer<typeof RegressionPointPropertiesSchema>;

/** Regression 趋势 Path properties */
export type IRRegressionTrendProperties = ZodInfer<typeof RegressionTrendPropertiesSchema>;

/** 回归标记的作者输入 IR */
export type IRRegressionMark = ZodInfer<typeof RegressionChartMarkSchema>;

/** Regression 额外趋势配置 */
export type IRRegressionExtraMethod = ZodInfer<typeof RegressionExtraMethodSchema>;
