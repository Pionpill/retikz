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
  PlotFacetOptionsSchema,
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

export const ScatterPositionScaleOperationSchema = union([
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
]).describe('Scatter position scale operation');

export const ScatterColorScaleOperationSchema = union([
  OrdinalScaleSchema,
  SequentialColorScaleSchema,
  DivergingColorScaleSchema,
  QuantizeColorScaleSchema,
  ThresholdColorScaleSchema,
  QuantileColorScaleSchema,
  CustomScaleSchema,
]).describe('Scatter color scale operation');

export const ScatterPositionScaleBindingSchema = createChartScaleBindingSchema(ScatterPositionScaleOperationSchema);
export const ScatterColorScaleBindingSchema = createChartScaleBindingSchema(ScatterColorScaleOperationSchema);
export const ScatterSizeScaleBindingSchema = createChartScaleBindingSchema(union([SqrtScaleSchema]));
export const ScatterOpacityScaleBindingSchema = createChartScaleBindingSchema(union([LinearScaleSchema]));

const createJitterMappingSchema = (role: 'x' | 'y') =>
  strictObject({
    transform: JitterTransformSchema,
    output: NonBlankStringSchema,
    scale: ScatterPositionScaleBindingSchema.optional(),
  })
    .superRefine((mapping, context) => {
      const axis = mapping.transform.axis ?? 'x';
      const field = role === 'x' ? (mapping.transform.xField ?? 'x') : (mapping.transform.yField ?? 'y');
      if (axis !== role) {
        context.addIssue({
          code: 'custom',
          path: ['transform', 'axis'],
          message: `Scatter ${role} jitter must target only the ${role} axis`,
        });
      }
      if (mapping.output !== field) {
        context.addIssue({
          code: 'custom',
          path: ['output'],
          message: `Scatter ${role} jitter output must equal its ${role} field`,
        });
      }
    })
    .describe(`Scatter ${role} jitter mapping`);

export const ScatterXEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(ScatterPositionScaleBindingSchema),
  createChartAggregateMappingSchema(ScatterPositionScaleBindingSchema),
  createChartDerivedMappingSchema(BinTransformSchema, ScatterPositionScaleBindingSchema),
  createChartDerivedMappingSchema(NormalizeTransformSchema, ScatterPositionScaleBindingSchema),
  createJitterMappingSchema('x'),
  createChartDerivedMappingSchema(ExternalPlotTransformSchema, ScatterPositionScaleBindingSchema),
]).describe('Scatter x field mapping');

export const ScatterYEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(ScatterPositionScaleBindingSchema),
  createChartAggregateMappingSchema(ScatterPositionScaleBindingSchema),
  createChartDerivedMappingSchema(BinTransformSchema, ScatterPositionScaleBindingSchema),
  createChartDerivedMappingSchema(NormalizeTransformSchema, ScatterPositionScaleBindingSchema),
  createJitterMappingSchema('y'),
  createChartDerivedMappingSchema(ExternalPlotTransformSchema, ScatterPositionScaleBindingSchema),
]).describe('Scatter y field mapping');

export const ScatterColorEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(ScatterColorScaleBindingSchema),
  createChartAggregateMappingSchema(ScatterColorScaleBindingSchema),
]).describe('Scatter color field mapping');

export const ScatterSizeEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(ScatterSizeScaleBindingSchema),
  createChartAggregateMappingSchema(ScatterSizeScaleBindingSchema),
  createChartDerivedMappingSchema(NormalizeTransformSchema, ScatterSizeScaleBindingSchema),
  createChartDerivedMappingSchema(ExternalPlotTransformSchema, ScatterSizeScaleBindingSchema),
]).describe('Scatter size field mapping');

export const ScatterOpacityEncodingSchema = union([
  NonBlankStringSchema,
  createChartDirectMappingSchema(ScatterOpacityScaleBindingSchema),
  createChartAggregateMappingSchema(ScatterOpacityScaleBindingSchema),
  createChartDerivedMappingSchema(NormalizeTransformSchema, ScatterOpacityScaleBindingSchema),
  createChartDerivedMappingSchema(ExternalPlotTransformSchema, ScatterOpacityScaleBindingSchema),
]).describe('Scatter opacity field mapping');

export const ScatterShapeEncodingSchema = union([NonBlankStringSchema, createChartDirectMappingSchema()]).describe(
  'Scatter shape field mapping',
);

export const ScatterChartEncodingsSchema = strictObject({
  x: ScatterXEncodingSchema,
  y: ScatterYEncodingSchema,
  color: ScatterColorEncodingSchema.optional(),
  size: ScatterSizeEncodingSchema.optional(),
  opacity: ScatterOpacityEncodingSchema.optional(),
  shape: ScatterShapeEncodingSchema.optional(),
  row: union([NonBlankStringSchema, PlotPartitionDimensionsSchema]).optional(),
  column: union([NonBlankStringSchema, PlotPartitionDimensionsSchema]).optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => {
    const hasFacetDimensions = encodings.row !== undefined || encodings.column !== undefined;
    const hasFacet = hasFacetDimensions || encodings.facet !== undefined;
    if (encodings.facet !== undefined && !hasFacetDimensions) {
      context.addIssue({
        code: 'custom',
        path: ['facet'],
        message: 'Scatter facet options require row or column encoding',
      });
    }
    if (hasFacet) {
      for (const role of ['x', 'y'] as const) {
        const mapping = encodings[role];
        if (typeof mapping !== 'string' && 'transform' in mapping && mapping.transform.kind === 'bin') {
          context.addIssue({
            code: 'custom',
            path: [role, 'transform'],
            message: 'Scatter bin mapping cannot be combined with facet composition',
          });
        }
      }
    }
  })
  .describe('Scatter Chart exact field mapping plan');
