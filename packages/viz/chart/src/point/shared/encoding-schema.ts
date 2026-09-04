import type { infer as ZodInfer, RefinementCtx } from 'zod';

import { NonBlankStringSchema } from '@retikz/foundation';
import {
  BandScaleSchema,
  BinTransformSchema,
  CustomScaleSchema,
  DivergingColorScaleSchema,
  ExternalPlotTransformSchema,
  JitterTransformSchema,
  LinearScaleSchema,
  LogScaleSchema,
  NormalizeTransformSchema,
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
import { strictObject, union } from 'zod';

import {
  createChartAggregateMappingSchema,
  createChartDerivedMappingSchema,
  createChartDirectMappingSchema,
  createChartScaleBindingSchema,
} from '../../_chart/schemas/encoding';

/** Point 位置通道允许使用的尺度 operation */
export const PointPositionScaleOperationSchema = union([
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
export const PointColorScaleOperationSchema = union([
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

const createPointJitterMappingSchema = (role: 'x' | 'y', chartType: string) =>
  strictObject({
    transform: JitterTransformSchema,
    output: NonBlankStringSchema,
    scale: PointPositionScaleBindingSchema.optional(),
  })
    .superRefine((mapping, context) => {
      const axis = mapping.transform.axis ?? 'x';
      const field = role === 'x' ? (mapping.transform.xField ?? 'x') : (mapping.transform.yField ?? 'y');
      if (axis !== role) {
        context.addIssue({
          code: 'custom',
          path: ['transform', 'axis'],
          message: `${chartType} ${role} jitter must target only the ${role} axis`,
        });
      }
      if (mapping.output !== field) {
        context.addIssue({
          code: 'custom',
          path: ['output'],
          message: `${chartType} ${role} jitter output must equal its ${role} field`,
        });
      }
    })
    .describe(`${chartType} ${role} jitter mapping`);

/** 创建具体 Point chartType 的位置字段映射 schema */
export const createPointPositionEncodingSchema = (role: 'x' | 'y', chartType: string) =>
  union([
    NonBlankStringSchema,
    createChartDirectMappingSchema(PointPositionScaleBindingSchema),
    createChartAggregateMappingSchema(PointPositionScaleBindingSchema),
    createChartDerivedMappingSchema(BinTransformSchema, PointPositionScaleBindingSchema),
    createChartDerivedMappingSchema(NormalizeTransformSchema, PointPositionScaleBindingSchema),
    createPointJitterMappingSchema(role, chartType),
    createChartDerivedMappingSchema(ExternalPlotTransformSchema, PointPositionScaleBindingSchema),
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
  createChartDerivedMappingSchema(NormalizeTransformSchema, PointSizeScaleBindingSchema),
  createChartDerivedMappingSchema(ExternalPlotTransformSchema, PointSizeScaleBindingSchema),
]).describe('Point size field mapping');

/** Point 透明度字段映射 */
export const PointOpacityEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(PointOpacityScaleBindingSchema),
  createChartAggregateMappingSchema(PointOpacityScaleBindingSchema),
  createChartDerivedMappingSchema(NormalizeTransformSchema, PointOpacityScaleBindingSchema),
  createChartDerivedMappingSchema(ExternalPlotTransformSchema, PointOpacityScaleBindingSchema),
]).describe('Point opacity field mapping');

/** Point 形状字段映射 */
export const PointShapeEncodingSchema = union([NonBlankStringSchema, createChartDirectMappingSchema()]).describe(
  'Point shape field mapping',
);

/** Point 分面维度字段映射 */
export const PointPartitionEncodingSchema = union([NonBlankStringSchema, PlotPartitionDimensionsSchema]).describe(
  'Point facet partition field mapping',
);

export type IRPointPositionEncoding = ZodInfer<ReturnType<typeof createPointPositionEncodingSchema>>;

type PointFacetEncodingPlan = Readonly<{
  x: IRPointPositionEncoding;
  y: IRPointPositionEncoding;
  row?: unknown;
  column?: unknown;
  facet?: unknown;
}>;

/** 校验 Point chartType 共用的分面与位置变换组合约束 */
export const refinePointFacetEncodings = (
  encodings: PointFacetEncodingPlan,
  context: RefinementCtx,
  chartType: string,
): void => {
  const hasFacetDimensions = encodings.row !== undefined || encodings.column !== undefined;
  const hasFacet = hasFacetDimensions || encodings.facet !== undefined;
  if (encodings.facet !== undefined && !hasFacetDimensions) {
    context.addIssue({
      code: 'custom',
      path: ['facet'],
      message: `${chartType} facet options require row or column encoding`,
    });
  }
  if (!hasFacet) return;
  for (const role of ['x', 'y'] as const) {
    const mapping = encodings[role];
    if (typeof mapping !== 'string' && 'transform' in mapping && mapping.transform.kind === 'bin') {
      context.addIssue({
        code: 'custom',
        path: [role, 'transform'],
        message: `${chartType} bin mapping cannot be combined with facet composition`,
      });
    }
  }
};
