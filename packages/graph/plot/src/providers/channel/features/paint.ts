import { isFiniteNumber } from '@retikz/math';
import { type IRPaintSpec, PaintSpecSchema } from '@retikz/core';
import { ChannelDefinitionKind, type ChannelResolveContext, type MarkChannelDefinition, isBuiltinScaleOperation } from '../../../contract';
import { coerceTimestamp, resolveFieldPath } from '../../data';
import { type CategoryOrder, orderedCategoryDomain, resolveChannelScale } from '../../scale';
import { type Channel, type MarkOperation, PlotFieldType, type PlotFieldTypeMap, PlotScale, type PlotSpec, type ScaleOperation } from '../../../schemas';

export type ColorChannelDefinitionOptions = {
  channel: string;
  pick: (mark: MarkOperation) => Channel | undefined;
  constantPaint?: boolean;
};

export type PlotPaint = string | IRPaintSpec;

const parsePaintConstant = (channelName: string, value: unknown, allowPaintSpec: boolean): PlotPaint => {
  if (typeof value === 'string') return value;
  if (allowPaintSpec) {
    const result = PaintSpecSchema.safeParse(value);
    if (result.success) return result.data;
  }
  throw new Error(`lowerPlots: constant ${channelName} channel must be a CSS color string${allowPaintSpec ? ' or core PaintSpec' : ''}`);
};

/**
 * 创建 color-like mark 通道（color / fill / stroke）。
 * @description 常量 value 直返；字段值经 channel scale registry 取色。连续 / temporal 字段必须显式引用 color scale。
 */
export const makeColorChannelDefinition = (options: ColorChannelDefinitionOptions): MarkChannelDefinition<PlotPaint> => ({
  channel: options.channel,
  kind: ChannelDefinitionKind.Mark,
  resolve: ctx => {
    const scaleByName = new Map(ctx.node.scales.map(scale => [scale.name, scale] as const));
    const fieldOrders = new Map<string, CategoryOrder>();
    for (const field of ctx.node.data.model ?? []) {
      if (field.order !== undefined) fieldOrders.set(field.name, field.order);
    }
    return (mark: MarkOperation) => {
      const channel = options.pick(mark);
      if (!channel) return undefined;
      if (channel.value !== undefined) {
        const constant = parsePaintConstant(options.channel, channel.value, options.constantPaint ?? false);
        return { resolver: () => constant, defaultValue: constant };
      }
      if (channel.field === undefined) return undefined;
      if (ctx.scaleRegistry === undefined || ctx.resolveColorScheme === undefined) {
        throw new Error(`lowerPlots: ${options.channel} channel resolution requires scaleRegistry and resolveColorScheme in ChannelContext`);
      }
      const field = channel.field;
      const colorFieldType = ctx.fieldTypes.get(field);
      if ((colorFieldType === PlotFieldType.Continuous || colorFieldType === PlotFieldType.Temporal) && channel.scale === undefined) {
        throw new Error(`lowerPlots: continuous/temporal ${options.channel} field "${field}" requires an explicit sequential/diverging/quantize/threshold/quantile color scale reference`);
      }
      let scaleOperation: ScaleOperation;
      if (channel.scale !== undefined) {
        const found = scaleByName.get(channel.scale);
        if (!found) throw new Error(`lowerPlots: ${options.channel} channel references unknown scale "${channel.scale}"`);
        scaleOperation = found;
      } else {
        scaleOperation = { type: PlotScale.Ordinal, name: `__${options.channel}_${field}` };
      }
      const rawValues = ctx.rows.map(row => resolveFieldPath(row, field));
      if (isBuiltinScaleOperation(scaleOperation) && scaleOperation.type === PlotScale.Ordinal && scaleOperation.domain === undefined) {
        const order = fieldOrders.get(field);
        if (order !== undefined && order !== 'data') scaleOperation = { ...scaleOperation, domain: orderedCategoryDomain(rawValues, order) };
      }
      const resolution = resolveChannelScale(scaleOperation, rawValues, colorResolveContext(ctx.node, ctx.fieldTypes, field, ctx.resolveColorScheme), ctx.scaleRegistry);
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

const colorResolveContext = (node: PlotSpec, fieldTypes: PlotFieldTypeMap, field: string, resolveColorScheme: (name: string) => (t: number) => string): ChannelResolveContext => ({
  fieldType: fieldTypes.get(field),
  toNumber: value => (isFiniteNumber(value) ? value : null),
  coerceTimestamp,
  resolveColorScheme,
  defaultColors: node.colors,
});

export type BuiltinPaintChannels = {
  color: MarkChannelDefinition<PlotPaint>;
  fill: MarkChannelDefinition<PlotPaint>;
  stroke: MarkChannelDefinition<PlotPaint>;
};

const markValueChannel = (value: unknown): Channel | undefined => {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return undefined;
  const candidate = value as { kind?: unknown; value?: unknown; scale?: unknown };
  if (candidate.kind === 'field') return { field: String(candidate.value), ...(typeof candidate.scale === 'string' ? { scale: candidate.scale } : {}) };
  if (candidate.kind === 'constant') return { value: candidate.value as Channel['value'] };
  return undefined;
};

const encodingChannel = (mark: MarkOperation, channel: string): Channel | undefined =>
  (mark as { encoding?: Record<string, Channel | undefined> }).encoding?.[channel];

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
