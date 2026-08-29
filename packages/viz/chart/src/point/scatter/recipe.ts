import type { IRJsonObject } from '@retikz/core';
import type { IRPlotPartitionDimension } from '@retikz/plot';

import { DataFieldType, DataTransformFieldEffect, DataTransformPhase } from '@retikz/data';
import { PlotScale } from '@retikz/plot';

import type {
  ChartEncodingSpatialResolution,
  ChartRecipeDefinition,
  ChartRecipeResolveContext,
} from '../../_chart/contract';
import type { ChartEncodingFieldConsumer } from '../../_chart/resolve';
import type { IRScatterChart, IRScatterChartEncodings } from './schema';

import { ChartEncodingSpatialKind, defineChartRecipe } from '../../_chart/contract';
import { resolveChartEncodingMappings } from '../../_chart/resolve';
import { ChartType } from '../constants';
import { pointRecipeId } from '../shared/plot';
import {
  pointPropertySlots,
  pointResolutionOf,
  pointSlotsOf,
  pointThemeOf,
  resolvePointMark,
  sizeGuideOf,
} from '../shared/recipe';
import { ScatterMarkDefinition } from './mark';
import { ScatterChartSchema, ScatterChartThemeOverridesSchema, ScatterChartThemeResolutionSchema } from './schema';

const themeFallback: IRJsonObject = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
};

/** Scatter exact schema、调度与消费检查共用的encoding顺序 */
export const ScatterChartEncodingSlots = [
  'x',
  'y',
  'color',
  'size',
  'opacity',
  'shape',
  'row',
  'column',
  'facet',
] as const;

const scatterPositionTransformCapabilities = [
  { phase: DataTransformPhase.RowShape, fieldEffect: DataTransformFieldEffect.Replace },
  { phase: DataTransformPhase.FieldDerive, fieldEffect: DataTransformFieldEffect.Preserve },
  { phase: DataTransformPhase.FieldAdjust, fieldEffect: DataTransformFieldEffect.Preserve },
] as const;

const scatterContinuousTransformCapabilities = [
  { phase: DataTransformPhase.FieldDerive, fieldEffect: DataTransformFieldEffect.Preserve },
] as const;

type ScatterFieldEncodingSlot = Extract<
  keyof IRScatterChartEncodings,
  'x' | 'y' | 'color' | 'size' | 'opacity' | 'shape'
>;

const scatterFieldConsumers = [
  {
    slot: 'x',
    transforms: scatterPositionTransformCapabilities,
    scale: {
      family: 'position',
      positionRole: 'x',
      recipeFallback: pointRecipeId(ChartType.Scatter, 'scale.x'),
    },
  },
  {
    slot: 'y',
    transforms: scatterPositionTransformCapabilities,
    scale: {
      family: 'position',
      positionRole: 'y',
      recipeFallback: pointRecipeId(ChartType.Scatter, 'scale.y'),
    },
  },
  { slot: 'color', scale: { family: 'channel' } },
  {
    slot: 'size',
    transforms: scatterContinuousTransformCapabilities,
    outputType: DataFieldType.Continuous,
    scale: { family: 'position', type: PlotScale.Sqrt },
  },
  {
    slot: 'opacity',
    transforms: scatterContinuousTransformCapabilities,
    outputType: DataFieldType.Continuous,
    scale: { family: 'position', type: PlotScale.Linear },
  },
  { slot: 'shape' },
] satisfies ReadonlyArray<ChartEncodingFieldConsumer<ScatterFieldEncodingSlot>>;

const partitionDimensionsOf = (
  value: IRScatterChartEncodings['row'],
): IRPlotPartitionDimension | Array<IRPlotPartitionDimension> | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return { field: value };
  return value;
};

const scatterSpatialResolutionOf = (encodings: IRScatterChartEncodings): ChartEncodingSpatialResolution | undefined => {
  const row = partitionDimensionsOf(encodings.row);
  const column = partitionDimensionsOf(encodings.column);
  if (row !== undefined || column !== undefined) {
    return {
      kind: ChartEncodingSpatialKind.Facet,
      id: pointRecipeId(ChartType.Scatter, 'composition.facet'),
      view: pointRecipeId(ChartType.Scatter, 'view.main'),
      ...(row === undefined ? {} : { row }),
      ...(column === undefined ? {} : { column }),
      options: encodings.facet ?? {},
    };
  }
  return undefined;
};

/** Scatter Chart 的内建 semantic recipe Definition */
export const ScatterChartDefinition: ChartRecipeDefinition<IRScatterChart> = defineChartRecipe({
  chartType: ChartType.Scatter,
  encodingSlots: ScatterChartEncodingSlots,
  schema: ScatterChartSchema,
  theme: {
    overridesSchema: ScatterChartThemeOverridesSchema,
    resolutionSchema: ScatterChartThemeResolutionSchema,
    fallback: themeFallback,
  },
  consumes: {
    encodings: ScatterChartEncodingSlots,
    properties: pointPropertySlots,
  },
  marks: [
    {
      definition: ScatterMarkDefinition,
      inherit: {
        encodings: ['x', 'y', 'color', 'size', 'opacity', 'shape'],
        properties: ['color', 'size', 'opacity', 'shape'],
      },
    },
  ],
  resolveEncodings: context => {
    const resolution = resolveChartEncodingMappings(context, ScatterChartEncodingSlots, scatterFieldConsumers);
    const spatial = scatterSpatialResolutionOf(context.encodings);
    return spatial === undefined ? resolution : { ...resolution, spatial };
  },
  resolve: (context: ChartRecipeResolveContext) => {
    const theme = pointThemeOf(context.recipeThemeTokens);
    const slots = pointSlotsOf(context);
    const mark = resolvePointMark(slots.encodings, slots.properties);
    const sizeGuide = sizeGuideOf(theme, slots.encodings);
    return pointResolutionOf(ChartType.Scatter, theme, [{ kind: ChartType.Scatter, plotMarks: [mark] }], {
      guides: sizeGuide === undefined ? [] : [sizeGuide],
    });
  },
});
