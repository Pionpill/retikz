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

/** 校验气泡图位置通道的尺度操作或已有尺度引用 */
export const BubblePositionScaleBindingSchema = PointPositionScaleBindingSchema.describe(
  'Bubble position scale binding',
);

/** 校验气泡图颜色通道的尺度操作或已有尺度引用 */
export const BubbleColorScaleBindingSchema = PointColorScaleBindingSchema.describe('Bubble color scale binding');

/** 校验气泡图 x 通道的字段、聚合或变换输出映射及可选尺度 */
export const BubbleXEncodingSchema = createPointPositionEncodingSchema('x', 'Bubble');

/** 校验气泡图 y 通道的字段、聚合或变换输出映射及可选尺度 */
export const BubbleYEncodingSchema = createPointPositionEncodingSchema('y', 'Bubble');

/** 校验气泡图颜色通道的字段或聚合映射及可选尺度 */
export const BubbleColorEncodingSchema = PointColorEncodingSchema.describe('Bubble color field mapping');

/** 校验气泡图尺寸通道的字段、聚合或变换输出映射及可选平方根尺度 */
export const BubbleSizeEncodingSchema = PointSizeEncodingSchema.describe('Bubble size field mapping');

/** 校验气泡图透明度通道的字段、聚合或变换输出映射及可选线性尺度 */
export const BubbleOpacityEncodingSchema = PointOpacityEncodingSchema.describe('Bubble opacity field mapping');

/** 校验气泡图形状通道的字段名或直接字段映射 */
export const BubbleShapeEncodingSchema = PointShapeEncodingSchema.describe('Bubble shape field mapping');

/** Bubble Chart 精确字段映射计划 */
export const BubbleChartEncodingsSchema = strictObject({
  x: BubbleXEncodingSchema,
  y: BubbleYEncodingSchema,
  size: BubbleSizeEncodingSchema,
  color: BubbleColorEncodingSchema.optional(),
  opacity: BubbleOpacityEncodingSchema.optional(),
  shape: BubbleShapeEncodingSchema.optional(),
  row: PointPartitionEncodingSchema.optional(),
  column: PointPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => refinePointFacetEncodings(encodings, context, 'Bubble'))
  .describe('Bubble Chart exact field mapping plan');
