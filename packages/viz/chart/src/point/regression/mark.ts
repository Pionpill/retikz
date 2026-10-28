import type { IRDataTransform } from '@retikz/data';
import { BuiltinDataTransform } from '@retikz/data';
import type { JsonObject } from '@retikz/foundation';
import type { IRPlotMark } from '@retikz/plot';
import { BuiltinPlotMark } from '@retikz/plot';

import type { ChartMarkDefinition, ChartMarkResolveContext } from '../../_chart/contract';
import { defineChartMark } from '../../_chart/contract';
import { markOpacityOf, mergeMarkProperties, requiredFieldOf, resolvePointMark } from '../shared';
import { pointRecipeId } from '../shared/plot';
import type { IRRegressionChartProperties, IRRegressionMark } from './schema';
import { RegressionChartMarkSchema, RegressionTrendCurveSchema } from './schema';

const trendXField = pointRecipeId('regression', 'trend.x');

const trendYField = pointRecipeId('regression', 'trend.y');

type RegressionSeriesMapping = Readonly<{
  field: string;
  scale: string;
}>;

const seriesMappingOf = (encodings: JsonObject): RegressionSeriesMapping | undefined => {
  if (!Object.hasOwn(encodings, 'series')) return undefined;

  const value = encodings.series;
  const fallbackScale = pointRecipeId('regression', 'scale.series');
  if (typeof value === 'string') return { field: value, scale: fallbackScale };

  const mapping = value as JsonObject;

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
    properties.point = mergeMarkProperties(inherited.point, explicit.point);
  }

  if (inherited.trend !== undefined || explicit.trend !== undefined) {
    properties.trend = mergeMarkProperties(inherited.trend, explicit.trend);
  }

  return properties;
};

const constantPathPropertiesOf = (properties: IRRegressionChartProperties): JsonObject => {
  const trend = properties.trend ?? {};
  const result: JsonObject = {};

  for (const name of ['strokeWidth', 'lineCap', 'lineJoin', 'zIndex', 'dashPattern', 'shadow', 'blendMode'] as const) {
    if (trend[name] !== undefined) result[name] = trend[name];
  }

  const opacity = markOpacityOf(trend);
  if (opacity !== undefined) result.opacity = opacity;
  return result;
};

/** 把一个 Regression semantic mark 解析为可选观测 Point、主趋势与有序额外趋势 */
export const resolveRegressionMarkGroup = (
  encodings: JsonObject,
  properties: IRRegressionChartProperties,
  hidePoints?: boolean,
): readonly [IRPlotMark, ...Array<IRPlotMark>] => {
  const x = requiredFieldOf(encodings, 'x', ['recipe', 'encodings', 'x']);
  const y = requiredFieldOf(encodings, 'y', ['recipe', 'encodings', 'y']);
  const series = seriesMappingOf(encodings);
  const pointProperties: JsonObject = {
    ...(properties.autoPadding === undefined ? {} : { autoPadding: properties.autoPadding }),
    ...(properties.point ?? {}),
  };
  const pointEncodings: JsonObject = { x, y };

  if (series !== undefined) {
    delete pointProperties.color;
    delete pointProperties.fill;
    pointEncodings.color = { field: series.field, scale: series.scale };
  }

  /** 在共享数据上创建一条 mark-local 趋势，仅额外项显式 stroke 可覆盖分类色 */
  const createTrend = (settings: IRRegressionChartProperties, explicitStroke = false): IRPlotMark => {
    const smooth: IRDataTransform = {
      kind: BuiltinDataTransform.Smooth,
      params: {
        x,
        y,
        ...(series === undefined ? {} : { groupBy: [series.field] }),
        ...(settings.method === undefined ? {} : { method: settings.method }),
        ...(settings.sampleCount === undefined ? {} : { sampleCount: settings.sampleCount }),
        ...(settings.extent === undefined ? {} : { extent: settings.extent }),
        xAs: trendXField,
        yAs: trendYField,
      },
    };
    const trend = settings.trend ?? {};
    const path: IRPlotMark = {
      type: BuiltinPlotMark.Path,
      transforms: [{ operation: smooth }],
      encodings: {
        position: { x: { field: trendXField }, y: { field: trendYField } },
        order: trendXField,
        ...(series === undefined ? {} : { series: series.field }),
        ...(series === undefined || explicitStroke ? {} : { stroke: { field: series.field, scale: series.scale } }),
      },
      properties: {
        closed: false,
        curve: trend.curve ?? RegressionTrendCurveSchema.parse(undefined),
        ...constantPathPropertiesOf(settings),
        ...(trend.stroke === undefined ? {} : { stroke: trend.stroke }),
      },
    };

    const resolved = path;

    return series === undefined ? { ...resolved, defaultColorGroup: 'trend' } : resolved;
  };

  const point = hidePoints ? undefined : resolvePointMark(pointEncodings, pointProperties);
  const trends: [IRPlotMark, ...Array<IRPlotMark>] = [
    createTrend(properties),
    ...(properties.extraMethods ?? []).map(extra =>
      createTrend(
        {
          ...properties,
          ...extra,
          trend: mergeMarkProperties(properties.trend, extra.trend),
        },
        extra.trend?.stroke !== undefined,
      ),
    ),
  ];

  return point === undefined
    ? trends
    : [series === undefined ? { ...point, defaultColorGroup: 'observation' } : point, ...trends];
};

/** 回归标记的作者定义 */
export const regressionMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'regression',
  schema: RegressionChartMarkSchema,
  resolve: context => {
    const source = context.source as IRRegressionMark;
    const encodings: JsonObject = { ...context.inherited.encodings, ...(source.encodings ?? {}) };
    return { marks: resolveRegressionMarkGroup(encodings, regressionPropertiesOf(context, source), source.hidePoints) };
  },
});
