import { BuiltinDataTransform } from '@retikz/data';
import type { JsonObject } from '@retikz/foundation';
import type { IRPlotMarkOperation } from '@retikz/plot';
import { PathMarkSchema, BuiltinPlotMark } from '@retikz/plot';

import type { ChartMarkDefinition, ChartMarkResolveContext } from '../../_chart/contract';
import { defineChartMark } from '../../_chart/contract';
import { requiredFieldOf, resolvePointMark } from '../shared';
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
    properties.point = { ...(inherited.point ?? {}), ...(explicit.point ?? {}) };
  }

  if (inherited.trend !== undefined || explicit.trend !== undefined) {
    properties.trend = { ...(inherited.trend ?? {}), ...(explicit.trend ?? {}) };
  }

  return properties;
};

const constantPathPropertiesOf = (properties: IRRegressionChartProperties): JsonObject => {
  const trend = properties.trend ?? {};
  const result: JsonObject = {};

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

/** 把一个 Regression semantic mark 解析为可选观测 Point、主趋势与有序额外趋势 */
export const resolveRegressionMarkGroup = (
  encodings: JsonObject,
  properties: IRRegressionChartProperties,
  hidePoints?: boolean,
): readonly [IRPlotMarkOperation, ...Array<IRPlotMarkOperation>] => {
  const x = requiredFieldOf(encodings, 'x', ['recipe', 'encodings', 'x']);
  const y = requiredFieldOf(encodings, 'y', ['recipe', 'encodings', 'y']);
  const series = seriesMappingOf(encodings);
  const pointProperties: JsonObject = { ...(properties.point ?? {}) };
  const pointEncodings: JsonObject = { x, y };

  if (series !== undefined) {
    delete pointProperties.color;
    delete pointProperties.fill;
    pointEncodings.color = { field: series.field, scale: series.scale };
  }

  /** 在共享数据上创建一条 mark-local 趋势，仅额外项显式 stroke 可覆盖分类色 */
  const createTrend = (settings: IRRegressionChartProperties, explicitStroke = false): IRPlotMarkOperation => {
    const smooth: JsonObject = {
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
    const path: JsonObject = {
      type: BuiltinPlotMark.Path,
      order: trendXField,
      closed: false,
      curve: RegressionTrendCurveSchema.parse(trend.curve),
      ...(series === undefined ? {} : { series: series.field }),
      transform: [{ operation: smooth }],
      encoding: { x: { field: trendXField }, y: { field: trendYField } },
      ...constantPathPropertiesOf(settings),
      ...(series === undefined || explicitStroke
        ? trend.stroke === undefined
          ? {}
          : { stroke: { kind: 'constant', value: trend.stroke } }
        : { stroke: { kind: 'field', value: series.field, scale: series.scale } }),
    };

    const resolved = PathMarkSchema.parse(path);

    return series === undefined ? { ...resolved, defaultColorGroup: 'trend' } : resolved;
  };

  const point = hidePoints ? undefined : resolvePointMark(pointEncodings, pointProperties);
  const trends: [IRPlotMarkOperation, ...Array<IRPlotMarkOperation>] = [
    createTrend(properties),
    ...(properties.extraMethods ?? []).map(extra =>
      createTrend(
        {
          ...properties,
          ...extra,
          trend: { ...properties.trend, ...extra.trend },
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
export const RegressionMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'regression',
  schema: RegressionChartMarkSchema,
  resolve: context => {
    const source = context.source as IRRegressionMark;
    const encodings: JsonObject = { ...context.inherited.encodings, ...(source.encodings ?? {}) };
    return { marks: resolveRegressionMarkGroup(encodings, regressionPropertiesOf(context, source), source.hidePoints) };
  },
});
