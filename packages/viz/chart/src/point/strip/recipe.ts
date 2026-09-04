import type { IRJsonObject } from '@retikz/core';
import type { IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';

import { PlotGuide, PositionScaleContinuity, readCoordinateScaleNames } from '@retikz/plot';

import type {
  ChartGuideDefaultsResolveContext,
  ChartRecipeDefinition,
  ChartRecipeResolveContext,
} from '../../_chart/contract';
import type { IRStripChart, IRStripChartProperties } from './schema';

import { defineChartRecipe } from '../../_chart/contract';
import { resolveChartEncodingMappings } from '../../_chart/resolve';
import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { ChartType } from '../constants';
import {
  pointFieldConsumersOf,
  pointPropertySlots,
  pointResolutionOf,
  pointSlotsOf,
  pointThemeOf,
  resolvePointScaleDefaults,
  sizeGuideOf,
} from '../shared';
import { resolveStripPointMark, StripMarkDefinition } from './mark';
import { StripChartSchema, StripChartThemeOverridesSchema, StripChartThemeResolutionSchema } from './schema';

const themeFallback: IRJsonObject = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
};

/** Strip exact schema、调度与消费检查共用的 encoding 顺序 */
export const StripChartEncodingSlots = ['x', 'y', 'color', 'size', 'opacity', 'shape'] as const;

const stripPropertySlots = [...pointPropertySlots, 'jitter', 'domainPadding'] as const;

const invalidStripTopology = (message: string, path: ReadonlyArray<string | number>): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidResolvedPlot,
    message,
    details: { path },
  });

const scaleContinuityOf = (
  scale: IRPlotScaleOperation,
  context: ChartGuideDefaultsResolveContext,
): 'continuous' | 'discrete' => {
  const definition = context.runtime.scales.get(scale.type);
  if (definition === undefined) {
    throw invalidStripTopology(`Strip position scale type "${scale.type}" is not registered`, ['recipe', 'encodings']);
  }
  if (definition.family !== 'position') {
    throw invalidStripTopology(`Strip scale "${scale.name}" must use a position Scale Definition`, [
      'recipe',
      'encodings',
    ]);
  }
  return definition.continuity;
};

const stripContinuityByRole = (
  context: ChartGuideDefaultsResolveContext,
): Readonly<Record<'x' | 'y', 'continuous' | 'discrete'>> => {
  if (context.spatial.coordinate === undefined) {
    throw invalidStripTopology('Strip requires a coordinate with x and y scale bindings', [
      'plotExtension',
      'composition',
    ]);
  }
  const coordinate = context.spatial.coordinate;
  const coordinateDefinition = context.runtime.coordinates.get(coordinate.type);
  if (coordinateDefinition === undefined) {
    throw invalidStripTopology(`Strip coordinate type "${coordinate.type}" is not registered`, ['coordinate']);
  }
  const scaleNames = readCoordinateScaleNames(coordinateDefinition, coordinate);
  const scaleByName = new Map(context.scales.map(scale => [scale.name, scale]));
  const continuityByRole: Partial<Record<'x' | 'y', 'continuous' | 'discrete'>> = {};
  for (const role of ['x', 'y'] as const) {
    const scaleName = scaleNames[role];
    const scale = scaleName === undefined ? undefined : scaleByName.get(scaleName);
    if (scale === undefined) {
      throw invalidStripTopology(`Strip ${role} role must resolve to a named position scale`, [
        'recipe',
        'encodings',
        role,
        'scale',
      ]);
    }
    continuityByRole[role] = scaleContinuityOf(scale, context);
  }
  return continuityByRole as Readonly<Record<'x' | 'y', 'continuous' | 'discrete'>>;
};

/** 验证 Strip scale topology，并让默认 grid 只跟随 continuous role */
export const resolveStripGuideDefaults = (context: ChartGuideDefaultsResolveContext): ReadonlyArray<IRPlotGuide> => {
  const continuityByRole = stripContinuityByRole(context);
  const continuousRoles = (['x', 'y'] as const).filter(
    role => continuityByRole[role] === PositionScaleContinuity.Continuous,
  );
  const discreteRoles = (['x', 'y'] as const).filter(
    role => continuityByRole[role] === PositionScaleContinuity.Discrete,
  );
  if (continuousRoles.length !== 1 || discreteRoles.length !== 1) {
    throw invalidStripTopology('Strip requires exactly one discrete and one continuous position scale', [
      'recipe',
      'encodings',
    ]);
  }
  if (context.source.plotExtension?.guides !== undefined) return context.guides;

  const continuousRole = continuousRoles[0];
  const hasDefaultGrid = context.guides.some(guide => guide.type === PlotGuide.Axis && guide.grid === true);
  return context.guides.map(guide => {
    if (guide.type !== PlotGuide.Axis || (guide.dimension !== 'x' && guide.dimension !== 'y')) return guide;
    const { grid: previousGrid, ...guideWithoutGrid } = guide;
    void previousGrid;
    return guide.dimension === continuousRole && hasDefaultGrid
      ? { ...guideWithoutGrid, grid: true }
      : guideWithoutGrid;
  });
};

/** Strip Chart 的内建 semantic recipe Definition */
export const StripChartDefinition: ChartRecipeDefinition<IRStripChart> = defineChartRecipe({
  chartType: ChartType.Strip,
  encodingSlots: StripChartEncodingSlots,
  schema: StripChartSchema,
  theme: {
    overridesSchema: StripChartThemeOverridesSchema,
    resolutionSchema: StripChartThemeResolutionSchema,
    fallback: themeFallback,
  },
  consumes: {
    encodings: StripChartEncodingSlots,
    properties: stripPropertySlots,
  },
  marks: [
    {
      definition: StripMarkDefinition,
      inherit: {
        encodings: ['x', 'y', 'color', 'size', 'opacity', 'shape'],
        properties: [...pointPropertySlots, 'jitter'],
      },
    },
  ],
  resolveEncodings: context =>
    resolveChartEncodingMappings(context, StripChartEncodingSlots, pointFieldConsumersOf(ChartType.Strip)),
  resolve: (context: ChartRecipeResolveContext) => {
    const theme = pointThemeOf(context.recipeThemeTokens);
    const slots = pointSlotsOf(context);
    const properties = slots.properties as IRStripChartProperties;
    const mark = resolveStripPointMark(slots.encodings, properties);
    const sizeGuide = sizeGuideOf(theme, slots.encodings);
    return pointResolutionOf(ChartType.Strip, theme, [{ kind: ChartType.Strip, plotMarks: [mark] }], {
      guides: sizeGuide === undefined ? [] : [sizeGuide],
    });
  },
  resolveScaleDefaults: resolvePointScaleDefaults,
  resolveGuideDefaults: resolveStripGuideDefaults,
});
