import type { JsonObject } from '@retikz/foundation';
import type { IRPlotMark } from '@retikz/plot';
import { BuiltinPlotMark } from '@retikz/plot';

import type { ChartMarkDefinition, ChartMarkResolveContext } from '../../_chart/contract';
import { defineChartMark } from '../../_chart/contract';
import { markOpacityOf, mergeMarkProperties, requiredFieldOf } from '../shared';
import type {
  IRRangedDotChartProperties,
  IRRangedDotMark,
  IRRangedDotPointProperties,
  IRRangedDotRangeProperties,
} from './schema';
import { RangedDotChartMarkSchema } from './schema';

const endpointGlyphOf = (properties: IRRangedDotPointProperties): JsonObject => {
  const glyph: JsonObject = {};

  for (const name of ['color', 'size', 'shape', 'fill', 'stroke', 'strokeWidth', 'rotate', 'minimumSize'] as const) {
    if (properties[name] !== undefined) glyph[name] = properties[name];
  }

  const opacity = markOpacityOf(properties);
  if (opacity !== undefined) glyph.opacity = opacity;
  return glyph;
};

const rangeStyleOf = (properties: IRRangedDotRangeProperties): JsonObject => {
  const style: JsonObject = {};

  for (const name of ['stroke', 'strokeWidth', 'shadow', 'blendMode'] as const) {
    if (properties[name] !== undefined) style[name] = properties[name];
  }

  const opacity = markOpacityOf(properties);
  if (opacity !== undefined) style.opacity = opacity;
  return style;
};

const rangePathOf = (properties: IRRangedDotRangeProperties): JsonObject | undefined => {
  const options: JsonObject = {};

  for (const name of ['lineCap', 'lineJoin', 'dashPattern'] as const) {
    if (properties[name] !== undefined) options[name] = properties[name];
  }

  return Object.keys(options).length === 0 ? undefined : { options: { style: options } };
};

const fieldMappingOf = (
  value: unknown,
  fallbackScale: string,
): Readonly<{ field: string; scale: string }> | undefined => {
  if (typeof value === 'string') return { field: value, scale: fallbackScale };
  if (value === null || Array.isArray(value) || typeof value !== 'object') return undefined;

  const mapping = value as JsonObject;

  return typeof mapping.field === 'string'
    ? { field: mapping.field, scale: typeof mapping.scale === 'string' ? mapping.scale : fallbackScale }
    : undefined;
};

/** 把一个 Ranged Dot semantic mark 解析为原子 projected Relation */
export const resolveRangedDotMark = (encodings: JsonObject, properties: IRRangedDotChartProperties): IRPlotMark => {
  const category = requiredFieldOf(encodings, 'category', ['recipe', 'encodings', 'category']);
  const start = requiredFieldOf(encodings, 'start', ['recipe', 'encodings', 'start']);
  const end = requiredFieldOf(encodings, 'end', ['recipe', 'encodings', 'end']);
  const sharedPoint = properties.point ?? {};
  const source = endpointGlyphOf(mergeMarkProperties(sharedPoint, properties.startPoint));
  const target = endpointGlyphOf(mergeMarkProperties(sharedPoint, properties.endPoint));
  const range = properties.range ?? {};
  const color = fieldMappingOf(encodings.color, '__chart.ranged-dot.scale.color');
  const style = rangeStyleOf(range);
  const path = rangePathOf(range);

  return {
    type: BuiltinPlotMark.Relation,
    encodings: {
      source: { position: { x: { field: start }, y: { field: category } } },
      target: { position: { x: { field: end }, y: { field: category } } },
      ...(color === undefined ? {} : { color }),
    },
    properties: {
      autoPadding: properties.autoPadding ?? 'max-radius',
      ...style,
      geometry: { kind: 'path', ...path },
      endpoints: { source, target },
    },
  };
};

const mergedPropertiesOf = (context: ChartMarkResolveContext, source: IRRangedDotMark): IRRangedDotChartProperties => {
  const inherited = context.inherited.properties as IRRangedDotChartProperties;
  const explicit = source.properties ?? {};

  return {
    ...inherited,
    ...explicit,
    ...(inherited.point !== undefined || explicit.point !== undefined
      ? { point: mergeMarkProperties(inherited.point, explicit.point) }
      : {}),
    ...(inherited.startPoint !== undefined || explicit.startPoint !== undefined
      ? { startPoint: mergeMarkProperties(inherited.startPoint, explicit.startPoint) }
      : {}),
    ...(inherited.endPoint !== undefined || explicit.endPoint !== undefined
      ? { endPoint: mergeMarkProperties(inherited.endPoint, explicit.endPoint) }
      : {}),
    ...(inherited.range !== undefined || explicit.range !== undefined
      ? { range: mergeMarkProperties(inherited.range, explicit.range) }
      : {}),
  };
};

/** 范围点标记的作者定义 */
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
