import { NonBlankStringSchema } from '@retikz/foundation';
import {
  BandScaleSchema,
  CustomScaleSchema,
  LinearScaleSchema,
  LogScaleSchema,
  PlotPartitionDimensionsSchema,
  PointScaleSchema,
  PowScaleSchema,
  RadialScaleSchema,
  SqrtScaleSchema,
  SymlogScaleSchema,
  TimeScaleSchema,
} from '@retikz/plot';
import type { infer as ZodInfer, RefinementCtx } from 'zod';
import { union, strictObject, boolean } from 'zod';

import {
  createChartAggregateMappingSchema,
  createChartDirectMappingSchema,
  createChartScaleBindingSchema,
} from './encoding';

/** Chart 位置通道允许使用的尺度 operation */
const ChartPositionScaleOperationSchema = union([
  LinearScaleSchema,
  BandScaleSchema,
  PointScaleSchema,
  TimeScaleSchema,
  LogScaleSchema,
  PowScaleSchema,
  SqrtScaleSchema,
  SymlogScaleSchema,
  RadialScaleSchema,
  CustomScaleSchema,
]).describe('Chart position scale operation');

/** Chart 位置通道的尺度绑定 */
export const ChartPositionScaleBindingSchema = createChartScaleBindingSchema(ChartPositionScaleOperationSchema);

/** 创建具体 具体 chartType 的位置字段映射 schema */
export const createChartPositionEncodingSchema = (role: 'x' | 'y', chartType: string) =>
  union([
    NonBlankStringSchema,
    createChartDirectMappingSchema(ChartPositionScaleBindingSchema),
    createChartAggregateMappingSchema(ChartPositionScaleBindingSchema),
  ]).describe(`${chartType} ${role} field mapping`);

/** Chart 分面维度字段映射 */
export const ChartPartitionEncodingSchema = union([NonBlankStringSchema, PlotPartitionDimensionsSchema]).describe(
  'Chart facet partition field mapping',
);

type IRChartPositionEncoding = ZodInfer<ReturnType<typeof createChartPositionEncodingSchema>>;

type ChartFacetEncodingPlan = Readonly<{
  x: IRChartPositionEncoding;
  y: IRChartPositionEncoding;
  row?: unknown;
  column?: unknown;
  facet?: unknown;
}>;

/** 校验 具体 chartType 共用的分面选项依赖 */
export const refineChartFacetEncodings = (
  encodings: ChartFacetEncodingPlan,
  context: RefinementCtx,
  chartType: string,
): void => {
  const hasFacetDimensions = encodings.row !== undefined || encodings.column !== undefined;
  if (encodings.facet !== undefined && !hasFacetDimensions) {
    context.addIssue({
      code: 'custom',
      path: ['facet'],
      message: `${chartType} facet options require row or column encoding`,
    });
  }
};
/** Chart recipe 生成默认 guide 的稀疏控制项 */
export const ChartRecipeGuidesSchema = strictObject({
  axis: boolean().optional().describe('Whether the recipe generates default axis guides'),
  grid: boolean().optional().describe('Whether generated axis guides include grid lines'),
  legend: boolean().optional().describe('Whether the recipe generates default legend guides'),
}).describe('Sparse Chart recipe guide generation controls');

export type IRChartRecipeGuides = ZodInfer<typeof ChartRecipeGuidesSchema>;
