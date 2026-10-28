import type { IRGraphicStyle } from '@retikz/core';
import { mergeGraphicStyle } from '@retikz/core';
import type { JsonObject, JsonValue } from '@retikz/foundation';
import type { IRPlotPointMark } from '@retikz/plot';
import { BuiltinPlotMark } from '@retikz/plot';

import type { ChartMarkResolveContext } from '../../_chart/contract/mark';
import { pointFieldMappingOf, requiredFieldOf } from './encoding';
import type { IRPointProperties } from './schema';

/** 将 Chart 字段映射下沉为 Plot 字段简写或具名尺度绑定 */
const markEncodingOf = (encodings: JsonObject, name: string): string | { field: string; scale: string } | undefined => {
  if (!Object.hasOwn(encodings, name)) return undefined;
  const mapping = pointFieldMappingOf(encodings[name], ['recipe', 'encodings', name]);
  return mapping.scale === undefined ? mapping.field : { field: mapping.field, scale: mapping.scale };
};

/** 将 Chart 固定透明度统一为 Plot 的独立因子 */
export const markOpacityOf = (properties: JsonObject): JsonObject | undefined => {
  const opacity = properties.opacity as IRGraphicStyle['opacity'];
  return typeof opacity === 'number' ? { overall: opacity } : opacity;
};

/** 保留非样式 slot 的覆盖规则，同时逐成员继承 opacity */
export const mergeMarkProperties = <T extends { opacity?: IRGraphicStyle['opacity'] }>(
  ...properties: Array<T | undefined>
): T => ({
  ...Object.assign({}, ...properties),
  ...mergeGraphicStyle(...properties.map(value => ({ opacity: value?.opacity }))),
});

const copyConstantProperty = (target: JsonObject, properties: JsonObject, name: string): void => {
  if (Object.hasOwn(properties, name)) target[name] = properties[name];
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

const pointRawPropertySlots: ReadonlyArray<keyof IRPointProperties> = ['dx', 'dy', 'label', 'autoPadding'];

const isJsonObject = (value: JsonValue): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

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
): IRPlotPointMark => {
  const x = requiredFieldOf(encodings, 'x', ['recipe', 'encodings', 'x']);
  const y = requiredFieldOf(encodings, 'y', ['recipe', 'encodings', 'y']);
  const bindings: IRPlotPointMark['encodings'] = { position: { x: { field: x }, y: { field: y } } };
  const fixed: JsonObject = {};
  const mark: IRPlotPointMark = { type: BuiltinPlotMark.Point, encodings: bindings, properties: fixed };
  if (options.coordinateView !== undefined) mark.coordinateView = options.coordinateView;
  for (const name of pointVisualSlots) {
    if (name === 'opacity') continue;
    const binding = markEncodingOf(encodings, name);
    if (binding !== undefined) bindings[name] = binding;
    if (Object.hasOwn(properties, name)) fixed[name] = properties[name];
  }
  const opacity = markOpacityOf(properties);
  if (opacity !== undefined) fixed.opacity = opacity;
  const overall = markEncodingOf(encodings, 'opacity');
  if (overall !== undefined) bindings.opacity = { overall };
  for (const name of pointConstantPropertySlots) copyConstantProperty(fixed, properties, name);
  for (const name of pointRawPropertySlots) copyRawProperty(fixed, properties, name);

  return mark;
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
