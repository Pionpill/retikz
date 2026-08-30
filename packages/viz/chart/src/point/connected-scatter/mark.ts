import type { IRJsonObject } from '@retikz/core';
import type { IRPlotMarkOperation } from '@retikz/plot';

import { PathMarkSchema, PlotMark } from '@retikz/plot';

import type { ChartMarkDefinition, ChartMarkResolveContext } from '../../_chart/contract';
import type { IRConnectedScatterChartProperties, IRConnectedScatterMark } from './schema';

import { defineChartMark } from '../../_chart/contract';
import { requiredFieldOf, resolvePointMark } from '../shared';
import { pointRecipeId } from '../shared/plot';
import { ConnectedScatterChartMarkSchema } from './schema';

const CURRENT_COLOR = 'currentColor';
const seriesScaleName = pointRecipeId('connected-scatter', 'scale.series');

const seriesOf = (encodings: IRJsonObject): Readonly<{ field: string; scale: string }> | undefined => {
  if (!Object.hasOwn(encodings, 'series')) return undefined;
  const value = encodings.series;
  if (typeof value === 'string') return { field: value, scale: seriesScaleName };
  const mapping = value as IRJsonObject;
  return { field: mapping.field as string, scale: typeof mapping.scale === 'string' ? mapping.scale : seriesScaleName };
};

const pathPropertiesOf = (properties: IRConnectedScatterChartProperties): IRJsonObject => {
  const source = properties.path ?? {};
  const result: IRJsonObject = {};
  for (const name of [
    'strokeWidth',
    'strokeOpacity',
    'opacity',
    'lineCap',
    'lineJoin',
    'dashPattern',
    'shadow',
    'blendMode',
  ] as const) {
    if (source[name] !== undefined) result[name] = { kind: 'constant', value: source[name] };
  }
  if (source.connectNulls !== undefined) result.connectNulls = source.connectNulls;
  return result;
};

/** 把一个 Connected Scatter semantic mark 解析为开放 Path 与 Point */
export const resolveConnectedScatterMarkGroup = (
  encodings: IRJsonObject,
  properties: IRConnectedScatterChartProperties,
): readonly [IRPlotMarkOperation, IRPlotMarkOperation] => {
  const x = requiredFieldOf(encodings, 'x', ['recipe', 'encodings', 'x']);
  const y = requiredFieldOf(encodings, 'y', ['recipe', 'encodings', 'y']);
  const order = requiredFieldOf(encodings, 'order', ['recipe', 'encodings', 'order']);
  const series = seriesOf(encodings);
  const pointEncodings: IRJsonObject = { x, y };
  const pointProperties: IRJsonObject = { ...(properties.point ?? {}) };
  const path: IRJsonObject = {
    type: PlotMark.Path,
    order,
    closed: false,
    ...(series === undefined ? {} : { series: series.field }),
    encoding: { x: { field: x }, y: { field: y } },
    ...pathPropertiesOf(properties),
  };
  if (series === undefined) {
    if (!Object.hasOwn(pointProperties, 'color') && !Object.hasOwn(pointProperties, 'fill')) {
      pointProperties.color = CURRENT_COLOR;
    }
    path.stroke = { kind: 'constant', value: properties.path?.stroke ?? CURRENT_COLOR };
  } else {
    if (!Object.hasOwn(pointProperties, 'color') && !Object.hasOwn(pointProperties, 'fill')) {
      pointEncodings.color = { field: series.field, scale: series.scale };
    }
    path.stroke =
      properties.path?.stroke === undefined
        ? { kind: 'field', value: series.field, scale: series.scale }
        : { kind: 'constant', value: properties.path.stroke };
  }
  return [PathMarkSchema.parse(path), resolvePointMark(pointEncodings, pointProperties)];
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
      ? { point: { ...(inherited.point ?? {}), ...(explicit.point ?? {}) } }
      : {}),
    ...(inherited.path !== undefined || explicit.path !== undefined
      ? { path: { ...(inherited.path ?? {}), ...(explicit.path ?? {}) } }
      : {}),
  };
};

/** Connected Scatter authored mark Definition */
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
