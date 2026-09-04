import type { IRJsonObject } from '@retikz/core';
import type { IRPlotGuide } from '@retikz/plot';

import { DataFieldType, DataTransformFieldEffect, DataTransformPhase } from '@retikz/data';
import { PlotGuide, PlotScale } from '@retikz/plot';

import type { ChartEncodingFieldConsumer } from '../../_chart/resolve';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { pointRecipeId } from './plot';

const invalidPoint = (message: string, path: ReadonlyArray<string | number>): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidChartIR,
    message,
    details: { path },
  });

/** 从已 parse 的 owner slice 读取必需字段 */
export const requiredFieldOf = (values: IRJsonObject, name: string, path: ReadonlyArray<string | number>): string => {
  const value = values[name];
  if (typeof value === 'string' && value.length > 0) return value;
  if (
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    typeof value.field === 'string' &&
    value.field.length > 0
  ) {
    return value.field;
  }
  throw invalidPoint(`Chart field "${name}" is required`, path);
};

/** 从已解析的 direct field mapping 读取字段与可选 scale */
export const pointFieldMappingOf = (
  value: unknown,
  path: ReadonlyArray<string | number>,
): Readonly<{ field: string; scale?: string }> => {
  if (typeof value === 'string' && value.length > 0) return { field: value };
  if (value !== null && !Array.isArray(value) && typeof value === 'object') {
    const mapping = value as Record<string, unknown>;
    const field = mapping.field;
    const scale = mapping.scale;
    if (typeof field === 'string' && field.length > 0 && (scale === undefined || typeof scale === 'string')) {
      return { field, ...(scale === undefined ? {} : { scale }) };
    }
  }
  throw invalidPoint('Chart encoding must be a resolved direct field mapping', path);
};

type PointFieldEncodingSlot = 'x' | 'y' | 'color' | 'size' | 'opacity' | 'shape';
type PointPositionFieldEncodingSlot = Extract<PointFieldEncodingSlot, 'x' | 'y'>;

const pointPositionTransformCapabilities = [
  { phase: DataTransformPhase.RowShape, fieldEffect: DataTransformFieldEffect.Replace },
  { phase: DataTransformPhase.FieldDerive, fieldEffect: DataTransformFieldEffect.Preserve },
  { phase: DataTransformPhase.FieldAdjust, fieldEffect: DataTransformFieldEffect.Preserve },
] as const;

const pointContinuousTransformCapabilities = [
  { phase: DataTransformPhase.FieldDerive, fieldEffect: DataTransformFieldEffect.Preserve },
] as const;

/** 创建具体 Point chartType 的位置字段 mapping consumers */
export const pointPositionFieldConsumersOf = (
  chartType: string,
): ReadonlyArray<ChartEncodingFieldConsumer<PointPositionFieldEncodingSlot>> => [
  {
    slot: 'x',
    transforms: pointPositionTransformCapabilities,
    scale: {
      family: 'position',
      positionRole: 'x',
      recipeFallback: { name: pointRecipeId(chartType, 'scale.x'), type: PlotScale.Linear },
    },
  },
  {
    slot: 'y',
    transforms: pointPositionTransformCapabilities,
    scale: {
      family: 'position',
      positionRole: 'y',
      recipeFallback: { name: pointRecipeId(chartType, 'scale.y'), type: PlotScale.Linear },
    },
  },
];

/** 创建具体 Point chartType 的完整字段 mapping consumers */
export const pointFieldConsumersOf = (
  chartType: string,
): ReadonlyArray<ChartEncodingFieldConsumer<PointFieldEncodingSlot>> => [
  ...pointPositionFieldConsumersOf(chartType),
  { slot: 'color', scale: { family: 'channel' } },
  {
    slot: 'size',
    transforms: pointContinuousTransformCapabilities,
    outputType: DataFieldType.Continuous,
    scale: { family: 'position', type: PlotScale.Sqrt },
  },
  {
    slot: 'opacity',
    transforms: pointContinuousTransformCapabilities,
    outputType: DataFieldType.Continuous,
    scale: { family: 'position', type: PlotScale.Linear },
  },
  { slot: 'shape' },
];

/** 生成尺寸图例；size field 不存在时不创建 guide */
export const sizeGuideOf = (
  theme: Readonly<{ legendEnabled: boolean }>,
  encodings: IRJsonObject,
): IRPlotGuide | undefined => {
  if (!theme.legendEnabled || !Object.hasOwn(encodings, 'size')) return undefined;
  pointFieldMappingOf(encodings.size, ['recipe', 'encodings', 'size']);
  return { type: PlotGuide.Legend, channel: 'size' };
};
