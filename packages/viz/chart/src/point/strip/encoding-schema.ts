import { NonBlankStringSchema } from '@retikz/foundation';
import { strictObject, union } from 'zod';

import { createChartDirectMappingSchema } from '../../_chart/schemas/encoding';
import {
  PointColorScaleBindingSchema,
  PointOpacityScaleBindingSchema,
  PointPositionScaleBindingSchema,
  PointSizeScaleBindingSchema,
} from '../shared';

/** 校验条带图位置通道的尺度操作或已有尺度引用 */
export const StripPositionScaleBindingSchema = PointPositionScaleBindingSchema.describe('Strip position scale binding');

/** 校验条带图颜色通道的尺度操作或已有尺度引用 */
export const StripColorScaleBindingSchema = PointColorScaleBindingSchema.describe('Strip color scale binding');

/** 校验条带图 x 通道的直接字段映射及可选尺度 */
export const StripXEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(StripPositionScaleBindingSchema),
]).describe('Strip x direct field mapping');

/** 校验条带图 y 通道的直接字段映射及可选尺度 */
export const StripYEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(StripPositionScaleBindingSchema),
]).describe('Strip y direct field mapping');

/** 校验条带图颜色通道的直接字段映射及可选尺度 */
export const StripColorEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(StripColorScaleBindingSchema),
]).describe('Strip color direct field mapping');

/** 校验条带图尺寸通道的直接字段映射及可选平方根尺度 */
export const StripSizeEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(PointSizeScaleBindingSchema),
]).describe('Strip size direct field mapping');

/** 校验条带图透明度通道的直接字段映射及可选线性尺度 */
export const StripOpacityEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(PointOpacityScaleBindingSchema),
]).describe('Strip opacity direct field mapping');

/** 校验条带图形状通道的字段名或直接字段映射 */
export const StripShapeEncodingSchema = union([NonBlankStringSchema, createChartDirectMappingSchema()]).describe(
  'Strip shape direct field mapping',
);

/** 校验条带图必填的 x、y 通道及可选视觉通道的直接字段映射 */
export const StripChartEncodingsSchema = strictObject({
  x: StripXEncodingSchema,
  y: StripYEncodingSchema,
  color: StripColorEncodingSchema.optional(),
  size: StripSizeEncodingSchema.optional(),
  opacity: StripOpacityEncodingSchema.optional(),
  shape: StripShapeEncodingSchema.optional(),
}).describe('Strip Chart exact direct field mapping plan');
