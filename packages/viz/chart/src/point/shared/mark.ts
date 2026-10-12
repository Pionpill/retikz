import type { IRGraphicStyle } from '@retikz/core';
import { mergeGraphicStyle } from '@retikz/core';
import type { JsonObject, JsonValue } from '@retikz/foundation';
import type { IRPlotMarkOperation } from '@retikz/plot';
import { BuiltinPlotMark, PointMarkSchema } from '@retikz/plot';

import type { ChartMarkResolveContext } from '../../_chart/contract/mark';
import { pointFieldMappingOf, requiredFieldOf } from './encoding';
import type { IRPointEncoding, IRPointProperties } from './schema';

/** 将 Chart 字段 / 常量 slot 转为 Plot mark style value */
export const markValueOf = (encodings: JsonObject, properties: JsonObject, name: string): JsonObject | undefined => {
  if (Object.hasOwn(encodings, name)) {
    const mapping = pointFieldMappingOf(encodings[name], ['recipe', 'encodings', name]);
    return { kind: 'field', value: mapping.field, ...(mapping.scale === undefined ? {} : { scale: mapping.scale }) };
  }

  if (Object.hasOwn(properties, name)) return { kind: 'constant', value: properties[name] };

  return undefined;
};

/** 将常量 opacity 成员与 overall 字段映射下沉到 Plot */
export const markOpacityOf = (encodings: JsonObject, properties: JsonObject): JsonObject | undefined => {
  const opacity = properties.opacity as IRGraphicStyle['opacity'];
  const factors = typeof opacity === 'number' ? { overall: opacity } : opacity;
  const result: JsonObject = {};
  for (const name of ['overall', 'fill', 'stroke'] as const) {
    if (factors?.[name] !== undefined) result[name] = { kind: 'constant', value: factors[name] };
  }
  const overall = markValueOf(encodings, {}, 'opacity');
  if (overall !== undefined) result.overall = overall;
  return Object.keys(result).length === 0 ? undefined : result;
};

/** 保留非样式 slot 的覆盖规则，同时逐成员继承 opacity */
export const mergeMarkProperties = <T extends { opacity?: IRGraphicStyle['opacity'] }>(
  ...properties: Array<T | undefined>
): T => ({
  ...Object.assign({}, ...properties),
  ...mergeGraphicStyle(...properties.map(value => ({ opacity: value?.opacity }))),
});

const copyConstantProperty = (target: JsonObject, properties: JsonObject, name: string): void => {
  if (Object.hasOwn(properties, name)) target[name] = { kind: 'constant', value: properties[name] };
};

const copyRawProperty = (target: JsonObject, properties: JsonObject, name: string): void => {
  if (Object.hasOwn(properties, name)) target[name] = properties[name];
};

const pointVisualSlots = ['color', 'size', 'opacity', 'shape'] as const;

const pointConstantPropertySlots: ReadonlyArray<keyof IRPointProperties> = [
  'textColor',
  'fill',
  'stroke',
  'strokeWidth',
  'rotate',
  'minimumSize',
  'zIndex',
  'align',
  'lineHeight',
  'maxTextWidth',
  'cornerRadius',
  'scale',
  'padding',
  'margin',
  'dashed',
  'dotted',
  'dashPattern',
  'font',
  'boundary',
  'shadow',
  'blendMode',
];

const pointRawPropertySlots: ReadonlyArray<keyof IRPointProperties> = ['dx', 'dy', 'label'];

const isJsonObject = (value: JsonValue): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Plot Point mark resolver 实际读取的 encoding slots */
export const pointEncodingSlots: ReadonlyArray<keyof IRPointEncoding> = ['x', 'y', ...pointVisualSlots];

/** Plot Point mark resolver 实际读取的 property slots */
export const pointPropertySlots: ReadonlyArray<keyof IRPointProperties> = [
  ...pointVisualSlots,
  ...pointConstantPropertySlots,
  ...pointRawPropertySlots,
];

/** 不包含常量尺寸的 Point property slots */
export const pointPropertySlotsWithoutSize = pointPropertySlots.filter(slot => slot !== 'size');

/** 把 Chart Point slots 解析为 Plot Point mark */
export const resolvePointMark = (
  encodings: JsonObject,
  properties: JsonObject,
  options: Readonly<{ coordinateView?: string }> = {},
): IRPlotMarkOperation => {
  const x = requiredFieldOf(encodings, 'x', ['recipe', 'encodings', 'x']);
  const y = requiredFieldOf(encodings, 'y', ['recipe', 'encodings', 'y']);
  const mark: JsonObject = {
    type: BuiltinPlotMark.Point,
    encoding: { x: { field: x }, y: { field: y } },
  };
  if (options.coordinateView !== undefined) mark.coordinateView = options.coordinateView;

  for (const name of pointVisualSlots) {
    if (name === 'opacity') continue;
    const value = markValueOf(encodings, properties, name);
    if (value !== undefined) mark[name] = value;
  }

  const opacity = markOpacityOf(encodings, properties);
  if (opacity !== undefined) mark.opacity = opacity;

  for (const name of pointConstantPropertySlots) copyConstantProperty(mark, properties, name);

  for (const name of pointRawPropertySlots) copyRawProperty(mark, properties, name);

  return PointMarkSchema.parse(mark);
};

const objectOf = (source: JsonObject, key: string): JsonObject => {
  if (!Object.hasOwn(source, key)) return {};
  const value = source[key];
  return isJsonObject(value) ? value : {};
};

/** 由 authored mark context 合并继承与显式 slot；显式值优先 */
export const markSlotsOf = (
  context: ChartMarkResolveContext,
): Readonly<{ encodings: JsonObject; properties: JsonObject }> => {
  const explicitEncodings = objectOf(context.source, 'encodings');
  const explicitProperties = objectOf(context.source, 'properties');
  const encodings = { ...context.inherited.encodings };

  for (const name of Object.keys(explicitProperties)) {
    if (name === 'opacity') {
      const opacity = explicitProperties.opacity as IRGraphicStyle['opacity'];
      if (typeof opacity !== 'number' && opacity?.overall === undefined) continue;
    }
    delete encodings[name];
  }

  return {
    encodings: { ...encodings, ...explicitEncodings },
    properties: mergeMarkProperties(context.inherited.properties, explicitProperties),
  };
};
