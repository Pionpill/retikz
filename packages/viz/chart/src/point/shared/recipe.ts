import type { IRJsonObject } from '@retikz/core';
import type { IRPlotGuide, IRPlotMarkOperation, IRPlotScaleOperation } from '@retikz/plot';

import { PlotGuide, PlotMark, PointMarkSchema } from '@retikz/plot';

import type { ChartMarkResolveContext } from '../../_chart/contract/mark';
import type {
  ChartRecipeResolution,
  ChartRecipeResolveContext,
  ChartSemanticMarkResolution,
} from '../../_chart/contract/recipe';
import type { IRPointEncoding, IRPointProperties } from './schema';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { pointAxisGuidesOf, pointCartesian2DOf } from './plot';
import { PointRecipeThemeResolutionSchema } from './schema';

const invalidPoint = (message: string, path: ReadonlyArray<string | number>): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidChartIR,
    message,
    details: { path },
  });

/** 从已 parse 的 owner slice 读取必需字段 */
export const requiredFieldOf = (values: IRJsonObject, name: string, path: ReadonlyArray<string | number>): string => {
  const value = values[name];
  if (typeof value !== 'string' || value.length === 0) throw invalidPoint(`Chart field "${name}" is required`, path);
  return value;
};

/** 将 Chart 字段 / 常量 slot 转为 Plot mark style value */
export const markValueOf = (
  encodings: IRJsonObject,
  properties: IRJsonObject,
  name: string,
): IRJsonObject | undefined => {
  if (Object.hasOwn(encodings, name)) {
    const field = encodings[name];
    if (typeof field !== 'string' || field.length === 0) {
      throw invalidPoint(`Chart encoding "${name}" must be a non-empty field`, ['recipe', 'encodings', name]);
    }
    return { kind: 'field', value: field };
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
  'dx',
  'dy',
  'label',
];

const pointRawPropertySlots: ReadonlyArray<keyof IRPointProperties> = ['dx', 'dy', 'label'];

/** Plot Point mark resolver 实际读取的 encoding slots */
export const pointEncodingSlots: ReadonlyArray<keyof IRPointEncoding> = ['x', 'y', ...pointVisualSlots];

/** Plot Point mark resolver 实际读取的 property slots */
export const pointPropertySlots: ReadonlyArray<keyof IRPointProperties> = [
  ...pointVisualSlots,
  ...pointConstantPropertySlots,
];

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

/** 已完成 theme fallback 的 Point recipe token */
export const pointThemeOf = (
  tokens: IRJsonObject,
): Readonly<{ axisEnabled: boolean; axisGridEnabled: boolean; legendEnabled: boolean }> =>
  PointRecipeThemeResolutionSchema.parse(tokens);

/** 生成 Point recipe 的共享 scaffold 与 guide */
export const pointResolutionOf = (
  chartType: string,
  theme: Readonly<{ axisEnabled: boolean; axisGridEnabled: boolean; legendEnabled: boolean }>,
  semanticMarks: readonly [ChartSemanticMarkResolution, ...Array<ChartSemanticMarkResolution>],
  options: Readonly<{
    scales?: ReadonlyArray<IRPlotScaleOperation>;
    guides?: ReadonlyArray<IRPlotGuide>;
  }> = {},
): ChartRecipeResolution => {
  const cartesian = pointCartesian2DOf(chartType);
  const scales = [...cartesian.scales, ...(options.scales ?? [])];
  const guides = [...pointAxisGuidesOf(chartType, theme), ...(options.guides ?? [])];
  return {
    scaffold: {
      scales: scales.map(value => ({ value, replaceable: true })),
      spatial: { coordinate: cartesian.coordinate, replaceable: true },
      guides: { value: guides, replaceable: true },
    },
    semanticMarks,
  };
};

/** 由 recipe context 提取通用 Point slot */
export const pointSlotsOf = (
  context: ChartRecipeResolveContext,
): Readonly<{ encodings: IRJsonObject; properties: IRJsonObject }> => ({
  encodings: context.encodings,
  properties: context.properties,
});

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

const objectOf = (source: IRJsonObject, key: string): IRJsonObject => {
  if (!Object.hasOwn(source, key)) return {};
  const value = source[key];
  if (value === null || Array.isArray(value) || typeof value !== 'object') return {};
  return value;
};

/** 生成尺寸图例；size field 不存在时不创建 guide */
export const sizeGuideOf = (
  theme: Readonly<{ legendEnabled: boolean }>,
  encodings: IRJsonObject,
): IRPlotGuide | undefined => {
  if (!theme.legendEnabled || typeof encodings.size !== 'string') return undefined;
  return { type: PlotGuide.Legend, channel: 'size' };
};
