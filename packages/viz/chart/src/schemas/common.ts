import { JsonObjectSchema } from '@retikz/core';
import { DataReferenceSchema } from '@retikz/data';
import {
  CoordinateCompositionSchema,
  CoordinateOperationSchema,
  GuideSchema,
  MarkOperationSchema,
  PlotLayoutSchema,
  ScaleOperationSchema,
  TransformSchema,
} from '@retikz/plot';
import { z } from 'zod';

import { ChartPresentationSchema } from '../presentation';
import { ChartThemeSurfaceSchema } from '../style';

/** Chart variant 共享字段的未 refined shape */
export const ChartSharedBaseSchema = z
  .strictObject({
    id: z.string().min(1).optional().describe('Optional stable Chart identity and outer scope id'),
    data: DataReferenceSchema.describe('Single Plot data reference owned by this Chart'),
    presentation: ChartPresentationSchema.optional().describe('Optional authored-order Chart presentation'),
    ...ChartThemeSurfaceSchema.shape,
    transform: z
      .array(TransformSchema)
      .optional()
      .describe('Explicit preprocessing transforms prepended before recipe transforms'),
    scales: z.array(ScaleOperationSchema).optional().describe('Explicit Plot scale replacements and extensions'),
    coordinate: CoordinateOperationSchema.optional().describe('Explicit single-coordinate override'),
    composition: CoordinateCompositionSchema.optional().describe('Explicit Plot coordinate composition override'),
    guides: z.array(GuideSchema).optional().describe('Explicit Plot guide collection replacing recipe defaults'),
    marks: z
      .array(MarkOperationSchema)
      .optional()
      .describe('Explicit Plot mark extensions appended after recipe marks'),
    layout: PlotLayoutSchema.optional().describe('Plot label layout forwarded to the resolved Plot'),
    width: z.number().positive().optional().describe('Resolved Plot intrinsic width in user units'),
    height: z.number().positive().optional().describe('Resolved Plot intrinsic height in user units'),
    meta: JsonObjectSchema.optional().describe('JSON-safe source metadata forwarded to the resolved Plot'),
  })
  .describe('Shared JSON-safe fields accepted by every Chart variant');

/** 为最终 Chart variant 统一校验空间根互斥 */
export const assertChartSpatialRoot = (
  value: { coordinate?: unknown; composition?: unknown },
  ctx: z.RefinementCtx,
): void => {
  if (value.coordinate !== undefined && value.composition !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['composition'],
      message: 'Chart spec cannot use coordinate and composition together',
    });
  }
};

/** Chart variant 可复用的最终共享字段契约 */
export const ChartSharedSchema = ChartSharedBaseSchema.superRefine(assertChartSpatialRoot).describe(
  'Shared JSON-safe Chart fields constrained to a single spatial root',
);

/** Chart variant 共享的 JSON-safe 字段 */
export type IRChartShared = z.infer<typeof ChartSharedSchema>;
