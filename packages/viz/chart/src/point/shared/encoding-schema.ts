import { NonBlankStringSchema } from '@retikz/foundation';
import {
  CustomScaleSchema,
  DivergingColorScaleSchema,
  LinearScaleSchema,
  OrdinalScaleSchema,
  QuantileColorScaleSchema,
  QuantizeColorScaleSchema,
  SequentialColorScaleSchema,
  SqrtScaleSchema,
  ThresholdColorScaleSchema,
} from '@retikz/plot';
import { union } from 'zod';

import {
  createChartAggregateMappingSchema,
  createChartDirectMappingSchema,
  createChartScaleBindingSchema,
} from '../../_chart/schemas/encoding';

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

/** Point 颜色通道的尺度绑定 */
export const PointColorScaleBindingSchema = createChartScaleBindingSchema(PointColorScaleOperationSchema);

/** Point 尺寸通道的 sqrt 尺度绑定 */
export const PointSizeScaleBindingSchema = createChartScaleBindingSchema(union([SqrtScaleSchema]));

/** Point 透明度通道的线性尺度绑定 */
export const PointOpacityScaleBindingSchema = createChartScaleBindingSchema(union([LinearScaleSchema]));

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
