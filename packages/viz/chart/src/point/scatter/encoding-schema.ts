import { PlotFacetOptionsSchema } from '@retikz/plot';
import { strictObject } from 'zod';

import {
  createPointPositionEncodingSchema,
  PointColorEncodingSchema,
  PointColorScaleBindingSchema,
  PointOpacityEncodingSchema,
  PointPartitionEncodingSchema,
  PointPositionScaleBindingSchema,
  PointShapeEncodingSchema,
  PointSizeEncodingSchema,
  refinePointFacetEncodings,
} from '../shared';

/** 校验散点图位置通道的尺度操作或已有尺度引用 */
export const ScatterPositionScaleBindingSchema = PointPositionScaleBindingSchema.describe(
  'Scatter position scale binding',
);

/** 校验散点图颜色通道的尺度操作或已有尺度引用 */
export const ScatterColorScaleBindingSchema = PointColorScaleBindingSchema.describe('Scatter color scale binding');

/** 校验散点图 x 通道的字段、聚合或变换输出映射及可选尺度 */
export const ScatterXEncodingSchema = createPointPositionEncodingSchema('x', 'Scatter');

/** 校验散点图 y 通道的字段、聚合或变换输出映射及可选尺度 */
export const ScatterYEncodingSchema = createPointPositionEncodingSchema('y', 'Scatter');

/** 校验散点图颜色通道的字段或聚合映射及可选尺度 */
export const ScatterColorEncodingSchema = PointColorEncodingSchema.describe('Scatter color field mapping');

/** 校验散点图尺寸通道的字段、聚合或变换输出映射及可选平方根尺度 */
export const ScatterSizeEncodingSchema = PointSizeEncodingSchema.describe('Scatter size field mapping');

/** 校验散点图透明度通道的字段、聚合或变换输出映射及可选线性尺度 */
export const ScatterOpacityEncodingSchema = PointOpacityEncodingSchema.describe('Scatter opacity field mapping');

/** 校验散点图形状通道的字段名或直接字段映射 */
export const ScatterShapeEncodingSchema = PointShapeEncodingSchema.describe('Scatter shape field mapping');

/** 校验散点图必填的 x、y 通道及可选视觉映射和分面设置 */
export const ScatterChartEncodingsSchema = strictObject({
  x: ScatterXEncodingSchema,
  y: ScatterYEncodingSchema,
  color: ScatterColorEncodingSchema.optional(),
  size: ScatterSizeEncodingSchema.optional(),
  opacity: ScatterOpacityEncodingSchema.optional(),
  shape: ScatterShapeEncodingSchema.optional(),
  row: PointPartitionEncodingSchema.optional(),
  column: PointPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => refinePointFacetEncodings(encodings, context, 'Scatter'))
  .describe('Scatter Chart exact field mapping plan');
