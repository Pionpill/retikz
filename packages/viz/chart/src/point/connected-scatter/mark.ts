import type { JsonObject } from '@retikz/foundation';
import type { IRPlotMarkOperation } from '@retikz/plot';
import { BuiltinPlotMark } from '@retikz/plot';

import type { ChartMarkDefinition, ChartMarkResolveContext } from '../../_chart/contract';
import { defineChartMark } from '../../_chart/contract';
import { markOpacityOf, mergeMarkProperties, requiredFieldOf, resolvePointMark } from '../shared';
import { pointRecipeId } from '../shared/plot';
import type { IRConnectedScatterChartProperties, IRConnectedScatterMark } from './schema';
import { ConnectedScatterChartMarkSchema } from './schema';

const seriesScaleName = pointRecipeId('connected-scatter', 'scale.series');

const seriesOf = (encodings: JsonObject): Readonly<{ field: string; scale: string }> | undefined => {
  if (!Object.hasOwn(encodings, 'series')) return undefined;

  const value = encodings.series;
  if (typeof value === 'string') return { field: value, scale: seriesScaleName };

  const mapping = value as JsonObject;

  return { field: mapping.field as string, scale: typeof mapping.scale === 'string' ? mapping.scale : seriesScaleName };
};

const pathPropertiesOf = (properties: IRConnectedScatterChartProperties): JsonObject => {
  const source = properties.path ?? {};
  const result: JsonObject = {};

  for (const name of ['strokeWidth', 'lineCap', 'lineJoin', 'dashPattern', 'shadow', 'blendMode'] as const) {
    if (source[name] !== undefined) result[name] = source[name];
  }

  const opacity = markOpacityOf(
    mergeMarkProperties(properties.colorMode === 'muted' ? { opacity: { stroke: 0.6 } } : {}, source),
  );
  if (opacity !== undefined) result.opacity = opacity;

  if (source.connectNulls !== undefined) result.connectNulls = source.connectNulls;
  if (source.curve !== undefined) result.curve = source.curve;

  return result;
};

/** 把一个 Connected Scatter semantic mark 解析为开放 Path 与 Point */
export const resolveConnectedScatterMarkGroup = (
  encodings: JsonObject,
  properties: IRConnectedScatterChartProperties,
): readonly [IRPlotMarkOperation, IRPlotMarkOperation] => {
  const x = requiredFieldOf(encodings, 'x', ['recipe', 'encodings', 'x']);
  const y = requiredFieldOf(encodings, 'y', ['recipe', 'encodings', 'y']);
  const order = requiredFieldOf(encodings, 'order', ['recipe', 'encodings', 'order']);
  const series = seriesOf(encodings);

  const pointEncodings: JsonObject = { x, y };
  const pointProperties: JsonObject = {
    ...(properties.autoPadding === undefined ? {} : { autoPadding: properties.autoPadding }),
    ...(properties.point ?? {}),
  };
  const separateColors = properties.colorMode === 'mark';
  const pathBindings: JsonObject = {
    position: { x: { field: x }, y: { field: y } },
    order,
    ...(series === undefined ? {} : { series: series.field }),
  };
  const pathProperties: JsonObject = { closed: false, ...pathPropertiesOf(properties) };
  const path: IRPlotMarkOperation = {
    type: BuiltinPlotMark.Path,
    encodings: pathBindings,
    properties: pathProperties,
  };
  if (series === undefined) {
    if (separateColors) path.defaultColorIndex = 1;
    if (properties.path?.stroke !== undefined) pathProperties.stroke = properties.path.stroke;
  } else {
    if (separateColors) {
      pointEncodings.color = { field: series.field, scale: `${series.scale}.point` };
      if (!Object.hasOwn(pointProperties, 'fill') && Object.hasOwn(pointProperties, 'color'))
        pointProperties.fill = pointProperties.color;
    } else if (!Object.hasOwn(pointProperties, 'color') && !Object.hasOwn(pointProperties, 'fill')) {
      pointEncodings.color = { field: series.field, scale: series.scale };
    }

    if (properties.path?.stroke === undefined)
      pathBindings.stroke = { field: series.field, scale: separateColors ? `${series.scale}.path` : series.scale };
    else pathProperties.stroke = properties.path.stroke;
  }

  const point = resolvePointMark(pointEncodings, pointProperties);

  return [path, separateColors && series === undefined ? { ...point, defaultColorIndex: 0 } : point];
};

const mergedPropertiesOf = (
  context: ChartMarkResolveContext,
  source: IRConnectedScatterMark,
): IRConnectedScatterChartProperties => {
  const inherited = context.inherited.properties as IRConnectedScatterChartProperties;
  const explicit = source.properties ?? {};

  return {
    ...inherited,
    ...explicit,
    ...(inherited.point !== undefined || explicit.point !== undefined
      ? { point: mergeMarkProperties(inherited.point, explicit.point) }
      : {}),
    ...(inherited.path !== undefined || explicit.path !== undefined
      ? { path: mergeMarkProperties(inherited.path, explicit.path) }
      : {}),
  };
};

/** 连接散点标记的作者定义 */
export const ConnectedScatterMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'connected-scatter',
  schema: ConnectedScatterChartMarkSchema,
  resolve: context => {
    const source = context.source as IRConnectedScatterMark;
    return {
      marks: resolveConnectedScatterMarkGroup(
        { ...context.inherited.encodings, ...(source.encodings ?? {}) },
        mergedPropertiesOf(context, source),
      ),
    };
  },
});
