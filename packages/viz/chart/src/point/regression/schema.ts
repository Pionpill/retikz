import type { infer as ZodInfer, RefinementCtx } from 'zod';

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
import { NonBlankStringSchema } from '@retikz/foundation';
import { SmoothTransformSchema } from '@retikz/plot';
import { array, boolean, enum as zodEnum, literal, number, strictObject, union } from 'zod';

import { createChartSourceSchema, createChartThemeSchema } from '../../_chart/schemas';
import { ChartFamily, ChartType } from '../constants';
import {
  PointPositionDomainPaddingSchema,
  PointPropertiesSchema,
  PointRecipeThemeOverridesSchema,
  PointRecipeThemeResolutionSchema,
} from '../shared';
import { RegressionChartEncodingsSchema } from './encoding-schema';

/** Regression 原始观测点的完整常量 properties */
export const RegressionPointPropertiesSchema = PointPropertiesSchema.describe(
  'Regression observation Point constant properties',
);

/** Regression 趋势 Path 允许的精确常量 properties */
export const RegressionTrendPropertiesSchema = strictObject({
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

const RegressionPropertiesBaseSchema = strictObject({
  method: SmoothTransformSchema.shape.method,
  sampleCount: SmoothTransformSchema.shape.sampleCount,
  extent: SmoothTransformSchema.shape.extent,
  point: RegressionPointPropertiesSchema.optional(),
  trend: RegressionTrendPropertiesSchema.optional(),
});

const refineRegressionProperties = (
  properties: ZodInfer<typeof RegressionPropertiesBaseSchema>,
  context: RefinementCtx,
): void => {
  if (properties.extent !== undefined && properties.extent[0] >= properties.extent[1]) {
    context.addIssue({
      code: 'custom',
      path: ['extent'],
      message: 'regression extent lower bound must be less than upper bound',
    });
  }
};

/** Regression authored mark 的拟合和外观 properties */
const RegressionMarkPropertiesSchema = RegressionPropertiesBaseSchema.superRefine(refineRegressionProperties).describe(
  'Regression authored mark fitting and constant appearance properties',
);

/** Regression recipe 的拟合、外观与位置 domain 留白 */
export const RegressionChartPropertiesSchema = RegressionPropertiesBaseSchema.extend({
  domainPadding: PointPositionDomainPaddingSchema.optional(),
})
  .superRefine(refineRegressionProperties)
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
  encodings: RegressionMarkEncodingsSchema.optional(),
  properties: RegressionMarkPropertiesSchema.optional(),
}).describe('Regression Chart mark payload');

/** Regression recipe 的严格 envelope */
export const RegressionChartRecipeSchema = strictObject({
  chartType: literal(ChartType.Regression).describe('Globally unique Regression recipe key'),
  encodings: RegressionChartEncodingsSchema,
  properties: RegressionChartPropertiesSchema.optional(),
  marks: array(RegressionChartMarkSchema).optional(),
}).describe('Regression Chart recipe payload');

/** Regression recipe 的稀疏主题 schema */
export const RegressionChartThemeOverridesSchema = PointRecipeThemeOverridesSchema.describe(
  'Regression Chart recipe theme overrides',
);

/** Regression recipe 的完整主题 schema */
export const RegressionChartThemeResolutionSchema = PointRecipeThemeResolutionSchema.describe(
  'Regression Chart recipe theme resolution',
);

/** Regression Chart 精确 Source schema */
export const RegressionChartSchema = createChartSourceSchema(
  ChartFamily.Point,
  RegressionChartRecipeSchema,
  createChartThemeSchema(RegressionChartThemeOverridesSchema).optional(),
).describe('Regression Chart Source IR');

/** Regression Chart 精确 Source IR */
export type IRRegressionChart = ZodInfer<typeof RegressionChartSchema>;

/** Regression recipe Source IR */
export type IRRegressionChartRecipe = ZodInfer<typeof RegressionChartRecipeSchema>;

/** Regression exact encoding plan */
export type IRRegressionChartEncodings = ZodInfer<typeof RegressionChartEncodingsSchema>;

/** Regression 拟合与外观 properties */
export type IRRegressionChartProperties = ZodInfer<typeof RegressionChartPropertiesSchema>;

/** Regression 原始观测点 properties */
export type IRRegressionPointProperties = ZodInfer<typeof RegressionPointPropertiesSchema>;

/** Regression 趋势 Path properties */
export type IRRegressionTrendProperties = ZodInfer<typeof RegressionTrendPropertiesSchema>;

/** Regression authored mark Source IR */
export type IRRegressionMark = ZodInfer<typeof RegressionChartMarkSchema>;
