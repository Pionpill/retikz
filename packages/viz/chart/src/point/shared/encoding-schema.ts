import { NonBlankStringSchema } from '@retikz/foundation';
import {
  BandScaleSchema,
  CustomScaleSchema,
  DivergingColorScaleSchema,
  LinearScaleSchema,
  LogScaleSchema,
  OrdinalScaleSchema,
  PlotPartitionDimensionsSchema,
  PointScaleSchema,
  PowScaleSchema,
  QuantileColorScaleSchema,
  QuantizeColorScaleSchema,
  RadialScaleSchema,
  SequentialColorScaleSchema,
  SqrtScaleSchema,
  SymlogScaleSchema,
  ThresholdColorScaleSchema,
  TimeScaleSchema,
} from '@retikz/plot';
import type { infer as ZodInfer, RefinementCtx } from 'zod';
import { union } from 'zod';

import {
  createChartAggregateMappingSchema,
  createChartDirectMappingSchema,
  createChartScaleBindingSchema,
} from '../../_chart/schemas/encoding';

/** Point 位置通道允许使用的尺度 operation */
const PointPositionScaleOperationSchema = union([
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
]).describe('Point position scale operation');

/** Point 颜色通道允许使用的尺度 operation */
const PointColorScaleOperationSchema = union([
  OrdinalScaleSchema,
  SequentialColorScaleSchema,
  DivergingColorScaleSchema,
  QuantizeColorScaleSchema,
  ThresholdColorScaleSchema,
  QuantileColorScaleSchema,
  CustomScaleSchema,
]).describe('Point color scale operation');

/** Point 位置通道的尺度绑定 */
export const PointPositionScaleBindingSchema = createChartScaleBindingSchema(PointPositionScaleOperationSchema);

/** Point 颜色通道的尺度绑定 */
export const PointColorScaleBindingSchema = createChartScaleBindingSchema(PointColorScaleOperationSchema);

/** Point 尺寸通道的 sqrt 尺度绑定 */
export const PointSizeScaleBindingSchema = createChartScaleBindingSchema(union([SqrtScaleSchema]));

/** Point 透明度通道的线性尺度绑定 */
export const PointOpacityScaleBindingSchema = createChartScaleBindingSchema(union([LinearScaleSchema]));

/** 创建具体 Point chartType 的位置字段映射 schema */
export const createPointPositionEncodingSchema = (role: 'x' | 'y', chartType: string) =>
  union([
    NonBlankStringSchema,
    createChartDirectMappingSchema(PointPositionScaleBindingSchema),
    createChartAggregateMappingSchema(PointPositionScaleBindingSchema),
  ]).describe(`${chartType} ${role} field mapping`);

/** Point 颜色字段映射 */
export const PointColorEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(PointColorScaleBindingSchema),
  createChartAggregateMappingSchema(PointColorScaleBindingSchema),
]).describe('Point color field mapping');

/** Point 尺寸字段映射 */
export const PointSizeEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(PointSizeScaleBindingSchema),
  createChartAggregateMappingSchema(PointSizeScaleBindingSchema),
]).describe('Point size field mapping');

/** Point 透明度字段映射 */
export const PointOpacityEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(PointOpacityScaleBindingSchema),
  createChartAggregateMappingSchema(PointOpacityScaleBindingSchema),
]).describe('Point opacity field mapping');

/** Point 形状字段映射 */
export const PointShapeEncodingSchema = union([NonBlankStringSchema, createChartDirectMappingSchema()]).describe(
  'Point shape field mapping',
);

/** Point 分面维度字段映射 */
export const PointPartitionEncodingSchema = union([NonBlankStringSchema, PlotPartitionDimensionsSchema]).describe(
  'Point facet partition field mapping',
);

type IRPointPositionEncoding = ZodInfer<ReturnType<typeof createPointPositionEncodingSchema>>;

type PointFacetEncodingPlan = Readonly<{
  x: IRPointPositionEncoding;
  y: IRPointPositionEncoding;
  row?: unknown;
  column?: unknown;
  facet?: unknown;
}>;

/** 校验 Point chartType 共用的分面选项依赖 */
export const refinePointFacetEncodings = (
  encodings: PointFacetEncodingPlan,
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
