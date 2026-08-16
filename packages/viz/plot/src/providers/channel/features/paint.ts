import type { IRPaint } from '@retikz/core';
import type { DataFieldTypeMap, IRDataFieldDefinition } from '@retikz/data';

import { PaintSchema } from '@retikz/core';
import { coerceTimestamp, resolveFieldPath } from '@retikz/data';
import { DataFieldType, FieldOrderMode } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type { ChannelScaleResolveContext, MarkChannelDefinition } from '../../../contract';
import type { ChannelPaletteContext } from '../../../contract';
import type { IRPlotChannel, IRPlotMarkOperation, IRPlotScaleOperation } from '../../../schemas';

import { ChannelDefinitionKind, isBuiltinScaleOperation } from '../../../contract';
import { PlotScale } from '../../../schemas';

/** 颜色通道 definition 的名称、取值与图例配置 */
export type ColorChannelDefinitionOptions = {
  channel: string;
  pick: (mark: IRPlotMarkOperation) => IRPlotChannel | undefined;
  constantPaint?: boolean;
};

/** plot 通道可下沉到 core 的颜色或 paint 值 */
export type PlotPaint = string | IRPaint;

const parsePaintConstant = (channelName: string, value: unknown, allowPaintSpec: boolean): PlotPaint => {
  if (typeof value === 'string') return value;
  if (allowPaintSpec) {
    const result = PaintSchema.safeParse(value);
    if (result.success) return result.data;
  }
  throw new Error(
    `lowerPlots: constant ${channelName} channel must be a CSS color string${allowPaintSpec ? ' or core IRPaint' : ''}`,
  );
};

/**
 * 创建 color-like mark 通道（color / fill / stroke）。
 * @description 常量 value 直返；字段值经 channel scale registry 取色。连续 / temporal 字段必须显式引用 color scale。
 */
export const makeColorChannelDefinition = (
  options: ColorChannelDefinitionOptions,
): MarkChannelDefinition<PlotPaint> => ({
  channel: options.channel,
  kind: ChannelDefinitionKind.Mark,
  resolve: ctx => {
    const scaleByName = new Map(ctx.node.scales.map(scale => [scale.name, scale] as const));
    const fieldOrders = new Map<string, NonNullable<IRDataFieldDefinition['order']>>();
    for (const field of ctx.node.data.model ?? []) {
      if (field.order !== undefined) fieldOrders.set(field.name, field.order);
    }
    return (mark: IRPlotMarkOperation) => {
      const channel = options.pick(mark);
      if (!channel) return undefined;
      if (channel.value !== undefined) {
        const constant = parsePaintConstant(options.channel, channel.value, options.constantPaint ?? false);
        return { resolver: () => constant, defaultValue: constant };
      }
      if (channel.field === undefined) return undefined;
      const field = channel.field;
      const colorFieldType = ctx.fieldTypes.get(field);
      if (
        (colorFieldType === DataFieldType.Continuous || colorFieldType === DataFieldType.Temporal) &&
        channel.scale === undefined
      ) {
        throw new Error(
          `lowerPlots: continuous/temporal ${options.channel} field "${field}" requires an explicit sequential/diverging/quantize/threshold/quantile color scale reference`,
        );
      }
      let scaleOperation: IRPlotScaleOperation;
      if (channel.scale !== undefined) {
        const found = scaleByName.get(channel.scale);
        if (!found)
          throw new Error(`lowerPlots: ${options.channel} channel references unknown scale "${channel.scale}"`);
        scaleOperation = found;
      } else {
        scaleOperation = { type: PlotScale.Ordinal, name: `__${options.channel}_${field}` };
      }
      const rawValues = ctx.rows.map(row => resolveFieldPath(row, field));
      if (
        isBuiltinScaleOperation(scaleOperation) &&
        scaleOperation.type === PlotScale.Ordinal &&
        scaleOperation.domain === undefined
      ) {
        const order = fieldOrders.get(field);
        if (order !== undefined && order !== FieldOrderMode.Appearance) {
          scaleOperation = { ...scaleOperation, domain: ctx.resolveCategoryDomain(rawValues, order) };
        }
      }
      const resolution = ctx.resolveChannelScale(
        scaleOperation,
        rawValues,
        colorResolveContext(ctx.fieldTypes, field, ctx.resolveColorScheme, ctx.palette),
      );
      return {
        resolver: row => resolution.of(resolveFieldPath(row, field)),
        descriptor: {
          channel: options.channel,
          scaleType: resolution.scaleType,
          domain: resolution.domain,
          range: resolution.range,
          field,
          fieldType: colorFieldType,
          scaleName: scaleOperation.name,
          colorScale: resolution,
        },
      };
    };
  },
});

const colorResolveContext = (
  fieldTypes: DataFieldTypeMap,
  field: string,
  resolveColorScheme: (name: string) => (t: number) => string,
  palette: ChannelPaletteContext | undefined,
): ChannelScaleResolveContext => ({
  fieldType: fieldTypes.get(field),
  toNumber: value => (isFiniteNumber(value) ? value : null),
  coerceTimestamp,
  resolveColorScheme,
  defaultColors: palette?.categorical,
  defaultSequentialScheme: palette?.sequential,
  defaultDivergingScheme: palette?.diverging,
});

/** 内置 paint 通道 definition 的按名称索引类型。 */
export type BuiltinPaintChannels = {
  color: MarkChannelDefinition<PlotPaint>;
  fill: MarkChannelDefinition<PlotPaint>;
  stroke: MarkChannelDefinition<PlotPaint>;
};

const markValueChannel = (value: unknown): IRPlotChannel | undefined => {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return undefined;
  const candidate = value as { kind?: unknown; value?: unknown; scale?: unknown };
  if (candidate.kind === 'field')
    return {
      field: String(candidate.value),
      ...(typeof candidate.scale === 'string' ? { scale: candidate.scale } : {}),
    };
  if (candidate.kind === 'constant') return { value: candidate.value as IRPlotChannel['value'] };
  return undefined;
};

const encodingChannel = (mark: IRPlotMarkOperation, channel: string): IRPlotChannel | undefined =>
  (mark as { encoding?: Record<string, IRPlotChannel | undefined> }).encoding?.[channel];

/** 创建内置 paint channel definitions。 */
export const createBuiltinPaintChannels = (): BuiltinPaintChannels => ({
  color: makeColorChannelDefinition({
    channel: 'color',
    pick: mark => markValueChannel((mark as Record<string, unknown>).color) ?? encodingChannel(mark, 'color'),
  }),
  fill: makeColorChannelDefinition({
    channel: 'fill',
    pick: mark => markValueChannel((mark as Record<string, unknown>).fill),
    constantPaint: true,
  }),
  stroke: makeColorChannelDefinition({
    channel: 'stroke',
    pick: mark => markValueChannel((mark as Record<string, unknown>).stroke),
    constantPaint: true,
  }),
});
