import type { IRJsonObject } from '@retikz/core';
import type { IRPlotMarkOperation } from '@retikz/plot';

import { PlotMark, RelationMarkSchema } from '@retikz/plot';

import type { ChartMarkDefinition, ChartMarkResolveContext } from '../../_chart/contract';
import type {
  IRRangedDotChartProperties,
  IRRangedDotMark,
  IRRangedDotPointProperties,
  IRRangedDotRangeProperties,
} from './schema';

import { defineChartMark } from '../../_chart/contract';
import { requiredFieldOf } from '../shared';
import { RangedDotChartMarkSchema } from './schema';

const endpointGlyphOf = (properties: IRRangedDotPointProperties): IRJsonObject => {
  const glyph: IRJsonObject = {};
  for (const name of [
    'color',
    'size',
    'shape',
    'fill',
    'stroke',
    'strokeWidth',
    'fillOpacity',
    'strokeOpacity',
    'opacity',
    'rotate',
    'minimumSize',
  ] as const) {
    if (properties[name] !== undefined) glyph[name] = { kind: 'constant', value: properties[name] };
  }
  return glyph;
};

const rangeStyleOf = (properties: IRRangedDotRangeProperties): IRJsonObject => {
  const style: IRJsonObject = {};
  for (const name of ['stroke', 'strokeWidth', 'strokeOpacity', 'opacity', 'shadow', 'blendMode'] as const) {
    if (properties[name] !== undefined) style[name] = { kind: 'constant', value: properties[name] };
  }
  return style;
};

const rangePathOf = (properties: IRRangedDotRangeProperties): IRJsonObject | undefined => {
  const options: IRJsonObject = {};
  for (const name of ['lineCap', 'lineJoin', 'dashPattern'] as const) {
    if (properties[name] !== undefined) options[name] = properties[name];
  }
  return Object.keys(options).length === 0 ? undefined : { options };
};

const fieldMappingOf = (
  value: unknown,
  fallbackScale: string,
): Readonly<{ field: string; scale: string }> | undefined => {
  if (typeof value === 'string') return { field: value, scale: fallbackScale };
  if (value === null || Array.isArray(value) || typeof value !== 'object') return undefined;
  const mapping = value as IRJsonObject;
  return typeof mapping.field === 'string'
    ? { field: mapping.field, scale: typeof mapping.scale === 'string' ? mapping.scale : fallbackScale }
    : undefined;
};

/** 把一个 Ranged Dot semantic mark 解析为原子 projected Relation */
export const resolveRangedDotMark = (
  encodings: IRJsonObject,
  properties: IRRangedDotChartProperties,
): IRPlotMarkOperation => {
  const category = requiredFieldOf(encodings, 'category', ['recipe', 'encodings', 'category']);
  const start = requiredFieldOf(encodings, 'start', ['recipe', 'encodings', 'start']);
  const end = requiredFieldOf(encodings, 'end', ['recipe', 'encodings', 'end']);
  const sharedPoint = properties.point ?? {};
  const source = endpointGlyphOf({ ...sharedPoint, ...(properties.startPoint ?? {}) });
  const target = endpointGlyphOf({ ...sharedPoint, ...(properties.endPoint ?? {}) });
  const range = properties.range ?? {};
  const color = fieldMappingOf(encodings.color, '__chart.ranged-dot.scale.color');
  const style = rangeStyleOf(range);
  const path = rangePathOf(range);

  return RelationMarkSchema.parse({
    type: PlotMark.Relation,
    source: { project: { x: start, y: category } },
    target: { project: { x: end, y: category } },
    style,
    ...(path === undefined ? {} : { path }),
    endpoints: { source, target },
    ...(color === undefined ? {} : { encoding: { color } }),
  });
};

const mergedPropertiesOf = (context: ChartMarkResolveContext, source: IRRangedDotMark): IRRangedDotChartProperties => {
  const inherited = context.inherited.properties as IRRangedDotChartProperties;
  const explicit = source.properties ?? {};
  return {
    ...inherited,
    ...explicit,
    ...(inherited.point !== undefined || explicit.point !== undefined
      ? { point: { ...(inherited.point ?? {}), ...(explicit.point ?? {}) } }
      : {}),
    ...(inherited.startPoint !== undefined || explicit.startPoint !== undefined
      ? { startPoint: { ...(inherited.startPoint ?? {}), ...(explicit.startPoint ?? {}) } }
      : {}),
    ...(inherited.endPoint !== undefined || explicit.endPoint !== undefined
      ? { endPoint: { ...(inherited.endPoint ?? {}), ...(explicit.endPoint ?? {}) } }
      : {}),
    ...(inherited.range !== undefined || explicit.range !== undefined
      ? { range: { ...(inherited.range ?? {}), ...(explicit.range ?? {}) } }
      : {}),
  };
};

/** Ranged Dot authored mark Definition */
export const RangedDotMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'ranged-dot',
  schema: RangedDotChartMarkSchema,
  resolve: context => {
    const source = context.source as IRRangedDotMark;
    return {
      marks: [
        resolveRangedDotMark(
          { ...context.inherited.encodings, ...(source.encodings ?? {}) },
          mergedPropertiesOf(context, source),
        ),
      ],
    };
  },
});
