import { DataScalarReducerOperationSchema } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import type { IRPlotScaleOperation } from '@retikz/plot';
import type { ZodType } from 'zod';
import { strictObject, union } from 'zod';

/**
 * 创建接受已有尺度引用或尺度操作声明的校验器
 * @template TOperation 允许声明的 Plot 尺度操作类型
 */
export const createChartScaleBindingSchema = <TOperation extends IRPlotScaleOperation>(
  operationSchema: ZodType<TOperation>,
) =>
  union([
    strictObject({
      reference: NonBlankStringSchema.describe('Existing named Plot scale'),
    }),
    strictObject({
      operation: operationSchema.describe('Authored named Plot scale operation'),
    }),
  ]).describe('Named Plot scale operation or reference');

/**
 * 创建直接绑定已有字段的校验器；未提供尺度校验器时不接受 scale 字段
 * @template TScale 可选尺度绑定的类型，未提供时为 never
 */
export const createChartDirectMappingSchema = <TScale = never>(scaleSchema?: ZodType<TScale>) =>
  strictObject({
    field: NonBlankStringSchema.describe('Existing field bound directly to this encoding slot'),
    ...(scaleSchema === undefined ? {} : { scale: scaleSchema.optional() }),
  }).describe('Direct Chart field mapping');

/**
 * 创建绑定单值聚合结果的校验器；未提供尺度校验器时不接受 scale 字段
 * @template TScale 可选尺度绑定的类型，未提供时为 never
 */
export const createChartAggregateMappingSchema = <TScale = never>(scaleSchema?: ZodType<TScale>) =>
  strictObject({
    aggregate: DataScalarReducerOperationSchema.describe('Single-scalar aggregate operation'),
    ...(scaleSchema === undefined ? {} : { scale: scaleSchema.optional() }),
  }).describe('Aggregate Chart field mapping');
