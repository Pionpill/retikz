import type { IRPlotScaleOperation, IRPlotTransform } from '@retikz/plot';
import type { ZodType } from 'zod';

import { DataScalarReducerOperationSchema } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { strictObject, union } from 'zod';

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

export const createChartDirectMappingSchema = <TScale = never>(scaleSchema?: ZodType<TScale>) =>
  strictObject({
    field: NonBlankStringSchema.describe('Existing field bound directly to this encoding slot'),
    ...(scaleSchema === undefined ? {} : { scale: scaleSchema.optional() }),
  }).describe('Direct Chart field mapping');

export const createChartAggregateMappingSchema = <TScale = never>(scaleSchema?: ZodType<TScale>) =>
  strictObject({
    aggregate: DataScalarReducerOperationSchema.describe('Single-scalar aggregate operation'),
    ...(scaleSchema === undefined ? {} : { scale: scaleSchema.optional() }),
  }).describe('Aggregate Chart field mapping');

export const createChartDerivedMappingSchema = <TTransform extends IRPlotTransform, TScale>(
  transformSchema: ZodType<TTransform>,
  scaleSchema: ZodType<TScale>,
) =>
  strictObject({
    transform: transformSchema.describe('Field-producing transform operation'),
    output: NonBlankStringSchema.describe('Transform output field bound to this encoding slot'),
    scale: scaleSchema.optional(),
  }).describe('Derived Chart field mapping');
