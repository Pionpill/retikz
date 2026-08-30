import type { IRJsonObject } from '@retikz/core';
import type { IRPlotMarkOperation } from '@retikz/plot';

import { PlotMark, PointMarkSchema } from '@retikz/plot';

import type { ChartMarkResolveContext } from '../../_chart/contract/mark';
import type { IRPointEncoding, IRPointProperties } from './schema';

import { pointFieldMappingOf, requiredFieldOf } from './encoding';

/** 将 Chart 字段 / 常量 slot 转为 Plot mark style value */
export const markValueOf = (
  encodings: IRJsonObject,
  properties: IRJsonObject,
  name: string,
): IRJsonObject | undefined => {
  if (Object.hasOwn(encodings, name)) {
    const mapping = pointFieldMappingOf(encodings[name], ['recipe', 'encodings', name]);
    return { kind: 'field', value: mapping.field, ...(mapping.scale === undefined ? {} : { scale: mapping.scale }) };
  }
  if (Object.hasOwn(properties, name)) return { kind: 'constant', value: properties[name] };
  return undefined;
};

const copyConstantProperty = (target: IRJsonObject, properties: IRJsonObject, name: string): void => {
  if (Object.hasOwn(properties, name)) target[name] = { kind: 'constant', value: properties[name] };
};

const copyRawProperty = (target: IRJsonObject, properties: IRJsonObject, name: string): void => {
  if (Object.hasOwn(properties, name)) target[name] = properties[name];
};

const pointVisualSlots = ['color', 'size', 'opacity', 'shape'] as const;

const pointConstantPropertySlots: ReadonlyArray<keyof IRPointProperties> = [
  'textColor',
  'fill',
  'stroke',
  'strokeWidth',
  'fillOpacity',
  'strokeOpacity',
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
  encodings: IRJsonObject,
  properties: IRJsonObject,
  options: Readonly<{ coordinateView?: string }> = {},
): IRPlotMarkOperation => {
  const x = requiredFieldOf(encodings, 'x', ['recipe', 'encodings', 'x']);
  const y = requiredFieldOf(encodings, 'y', ['recipe', 'encodings', 'y']);
  const mark: IRJsonObject = {
    type: PlotMark.Point,
    encoding: { x: { field: x }, y: { field: y } },
  };
  if (options.coordinateView !== undefined) mark.coordinateView = options.coordinateView;

  for (const name of pointVisualSlots) {
    const value = markValueOf(encodings, properties, name);
    if (value !== undefined) mark[name] = value;
  }
  for (const name of pointConstantPropertySlots) copyConstantProperty(mark, properties, name);
  for (const name of pointRawPropertySlots) copyRawProperty(mark, properties, name);
  return PointMarkSchema.parse(mark);
};

const objectOf = (source: IRJsonObject, key: string): IRJsonObject => {
  if (!Object.hasOwn(source, key)) return {};
  const value = source[key];
  if (value === null || Array.isArray(value) || typeof value !== 'object') return {};
  return value;
};

/** 由 authored mark context 合并继承与显式 slot；显式值优先 */
export const markSlotsOf = (
  context: ChartMarkResolveContext,
): Readonly<{ encodings: IRJsonObject; properties: IRJsonObject }> => {
  const explicitEncodings = objectOf(context.source, 'encodings');
  const explicitProperties = objectOf(context.source, 'properties');
  const encodings = { ...context.inherited.encodings };
  for (const name of Object.keys(explicitProperties)) delete encodings[name];
  return {
    encodings: { ...encodings, ...explicitEncodings },
    properties: { ...context.inherited.properties, ...explicitProperties },
  };
};
