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

  for (const name of ['stroke', 'strokeWidth', 'lineCap', 'lineJoin', 'dashPattern', 'shadow', 'blendMode'] as const) {
    if (properties[name] !== undefined) style[name] = properties[name];
  }

  const opacity = markOpacityOf(properties);
  if (opacity !== undefined) style.opacity = opacity;
  return style;
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

/** 将范围点语义图元展开为连接路径、起点和终点 */
export const resolveRangedDotMarkGroup = (
  encodings: JsonObject,
  properties: IRRangedDotChartProperties,
): readonly [IRPlotMark, IRPlotMark, IRPlotMark] => {
  const category = requiredFieldOf(encodings, 'category', ['recipe', 'encodings', 'category']);
  const start = requiredFieldOf(encodings, 'start', ['recipe', 'encodings', 'start']);
  const end = requiredFieldOf(encodings, 'end', ['recipe', 'encodings', 'end']);
  const sharedPoint = properties.point ?? {};
  const source = endpointGlyphOf(mergeMarkProperties(sharedPoint, properties.startPoint));
  const target = endpointGlyphOf(mergeMarkProperties(sharedPoint, properties.endPoint));
  const range = properties.range ?? {};
  const color = fieldMappingOf(encodings.color, '__chart.ranged-dot.scale.color');
  const style = rangeStyleOf(range);
  const from = { x: { field: start }, y: { field: category } };
  const to = { x: { field: end }, y: { field: category } };
  const autoPadding = properties.autoPadding ?? 'max-radius';

  return [
    {
      type: BuiltinPlotMark.Path,
      encodings: { from, to, ...(color === undefined ? {} : { color }) },
      properties: style,
    },
    {
      type: BuiltinPlotMark.Point,
      encodings: { position: from, ...(color === undefined || Object.hasOwn(source, 'color') ? {} : { color }) },
      properties: { ...source, autoPadding },
    },
    {
      type: BuiltinPlotMark.Point,
      encodings: { position: to, ...(color === undefined || Object.hasOwn(target, 'color') ? {} : { color }) },
      properties: { ...target, autoPadding },
    },
  ];
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
      marks: resolveRangedDotMarkGroup(
        { ...context.inherited.encodings, ...(source.encodings ?? {}) },
        mergedPropertiesOf(context, source),
      ),
    };
  },
});
