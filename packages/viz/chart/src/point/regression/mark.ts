import type { IRJsonObject } from '@retikz/core';
import type { IRPlotMarkOperation } from '@retikz/plot';

import { PathMarkSchema, PlotMark, PlotTransform } from '@retikz/plot';

import type { ChartMarkDefinition, ChartMarkResolveContext } from '../../_chart/contract';
import type { IRRegressionChartProperties, IRRegressionMark } from './schema';

import { defineChartMark } from '../../_chart/contract';
import { requiredFieldOf, resolvePointMark } from '../shared';
import { pointRecipeId } from '../shared/plot';
import { RegressionChartMarkSchema } from './schema';

const trendXField = pointRecipeId('regression', 'trend.x');
const trendYField = pointRecipeId('regression', 'trend.y');

type RegressionSeriesMapping = Readonly<{
  field: string;
  scale: string;
}>;

const seriesMappingOf = (encodings: IRJsonObject): RegressionSeriesMapping | undefined => {
  if (!Object.hasOwn(encodings, 'series')) return undefined;
  const value = encodings.series;
  const fallbackScale = pointRecipeId('regression', 'scale.series');
  if (typeof value === 'string') return { field: value, scale: fallbackScale };
  const mapping = value as IRJsonObject;
  return {
    field: mapping.field as string,
    scale: typeof mapping.scale === 'string' ? mapping.scale : fallbackScale,
  };
};

const regressionPropertiesOf = (
  context: ChartMarkResolveContext,
  source: IRRegressionMark,
): IRRegressionChartProperties => {
  const inherited = context.inherited.properties as IRRegressionChartProperties;
  const explicit = source.properties ?? {};
  const properties: IRRegressionChartProperties = { ...inherited, ...explicit };
  if (inherited.point !== undefined || explicit.point !== undefined) {
    properties.point = { ...(inherited.point ?? {}), ...(explicit.point ?? {}) };
  }
  if (inherited.trend !== undefined || explicit.trend !== undefined) {
    properties.trend = { ...(inherited.trend ?? {}), ...(explicit.trend ?? {}) };
  }
  return properties;
};

const constantPathPropertiesOf = (properties: IRRegressionChartProperties): IRJsonObject => {
  const trend = properties.trend ?? {};
  const result: IRJsonObject = {};
  for (const name of [
    'strokeWidth',
    'strokeOpacity',
    'opacity',
    'lineCap',
    'lineJoin',
    'zIndex',
    'dashPattern',
    'shadow',
    'blendMode',
  ] as const) {
    if (trend[name] !== undefined) result[name] = { kind: 'constant', value: trend[name] };
  }
  return result;
};

/** 把一个 Regression semantic mark 解析为原始 Point 与 mark-local Smooth Path */
export const resolveRegressionMarkGroup = (
  encodings: IRJsonObject,
  properties: IRRegressionChartProperties,
): readonly [IRPlotMarkOperation, IRPlotMarkOperation] => {
  const x = requiredFieldOf(encodings, 'x', ['recipe', 'encodings', 'x']);
  const y = requiredFieldOf(encodings, 'y', ['recipe', 'encodings', 'y']);
  const series = seriesMappingOf(encodings);
  const pointProperties: IRJsonObject = { ...(properties.point ?? {}) };
  const pointEncodings: IRJsonObject = { x, y };

  if (series !== undefined) {
    delete pointProperties.color;
    delete pointProperties.fill;
    pointEncodings.color = { field: series.field, scale: series.scale };
  }

  const smooth: IRJsonObject = {
    kind: PlotTransform.Smooth,
    x,
    y,
    ...(series === undefined ? {} : { groupBy: [series.field] }),
    ...(properties.method === undefined ? {} : { method: properties.method }),
    ...(properties.sampleCount === undefined ? {} : { sampleCount: properties.sampleCount }),
    ...(properties.extent === undefined ? {} : { extent: properties.extent }),
    xAs: trendXField,
    yAs: trendYField,
  };
  const trend = properties.trend ?? {};
  const path: IRJsonObject = {
    type: PlotMark.Path,
    order: trendXField,
    closed: false,
    ...(series === undefined ? {} : { series: series.field }),
    transform: [smooth],
    encoding: { x: { field: trendXField }, y: { field: trendYField } },
    ...constantPathPropertiesOf(properties),
    ...(series === undefined
      ? trend.stroke === undefined
        ? {}
        : { stroke: { kind: 'constant', value: trend.stroke } }
      : { stroke: { kind: 'field', value: series.field, scale: series.scale } }),
  };

  return [resolvePointMark(pointEncodings, pointProperties), PathMarkSchema.parse(path)];
};

/** Regression authored mark Definition */
export const RegressionMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'regression',
  schema: RegressionChartMarkSchema,
  resolve: context => {
    const source = context.source as IRRegressionMark;
    const encodings: IRJsonObject = { ...context.inherited.encodings, ...(source.encodings ?? {}) };
    return { marks: resolveRegressionMarkGroup(encodings, regressionPropertiesOf(context, source)) };
  },
});
