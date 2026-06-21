import { isFiniteNumber } from '@retikz/math';
import { ChannelDefinitionKind, type ChannelResolveContext, type MarkChannelDefinition, type ResolveLabel, isBuiltinScaleOperation } from '../../contract';
import { coerceTimestamp, labelOf, resolveFieldPath } from '../data';
import { type Channel, type MarkOperation, PlotFieldType, type PlotFieldTypeMap, PlotMark, PlotScale, type PlotSpec, type ScaleOperation, isBuiltinMark } from '../../schemas';
import { type CategoryOrder, orderedCategoryDomain } from '../scale';
import { resolveChannelScale } from '../scale/registry';

export type ColorChannelDefinitionOptions = {
  channel: string;
  pick: (mark: MarkOperation) => Channel | undefined;
};

/**
 * 创建 color-like mark 通道（color / fill / stroke）。
 * @description 常量 value 直返；字段值经 channel scale registry 取色。连续 / temporal 字段必须显式引用 color scale。
 */
export const makeColorChannelDefinition = (options: ColorChannelDefinitionOptions): MarkChannelDefinition<string> => ({
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
        const constant = String(channel.value);
        return { resolver: () => constant };
      }
      if (channel.field === undefined) return undefined;
      if (ctx.scaleRegistry === undefined || ctx.resolveColorScheme === undefined) {
        throw new Error(`lowerPlots: ${options.channel} channel resolution requires scaleRegistry and resolveColorScheme in ChannelContext`);
      }
      const field = channel.field;
      const colorFieldType = ctx.fieldTypes.get(field);
      if (colorFieldType === PlotFieldType.Continuous || colorFieldType === PlotFieldType.Temporal) {
        if (mark.type === PlotMark.Path || mark.type === PlotMark.Region) {
          throw new Error(
            `lowerPlots: continuous/temporal color field "${field}" is not supported on ${mark.type} marks (path-level glyph colored per series); continuous color applies to point / interval only`,
          );
        }
        if (channel.scale === undefined) {
          throw new Error(`lowerPlots: continuous/temporal ${options.channel} field "${field}" requires an explicit sequential/diverging/quantize/threshold/quantile color scale reference`);
        }
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

export type BuiltinMarkChannels = {
  color: MarkChannelDefinition<string>;
  fill: MarkChannelDefinition<string>;
  stroke: MarkChannelDefinition<string>;
  label: MarkChannelDefinition<string>;
};

export type BuiltinMarkChannelOptions = {
  resolveLabel?: Record<string, ResolveLabel>;
};

const pointMarkValueChannel = (value: { kind: 'field' | 'constant'; value: unknown; scale?: string } | undefined): Channel | undefined => {
  if (value === undefined) return undefined;
  return value.kind === 'field' ? { field: String(value.value), ...(value.scale !== undefined ? { scale: value.scale } : {}) } : { value: value.value as Channel['value'] };
};

/** 创建内置 mark channel definitions。 */
export const createBuiltinMarkChannels = (options: BuiltinMarkChannelOptions = {}): BuiltinMarkChannels => ({
  color: makeColorChannelDefinition({
    channel: 'color',
    pick: mark => {
      if (isBuiltinMark(mark) && mark.type === PlotMark.Point) return pointMarkValueChannel(mark.color);
      return (mark as { encoding?: Record<string, Channel | undefined> }).encoding?.color;
    },
  }),
  fill: makeColorChannelDefinition({
    channel: 'fill',
    pick: mark => (isBuiltinMark(mark) && mark.type === PlotMark.Point && mark.fill?.kind === 'field' ? { field: mark.fill.value, ...(mark.fill.scale !== undefined ? { scale: mark.fill.scale } : {}) } : undefined),
  }),
  stroke: makeColorChannelDefinition({
    channel: 'stroke',
    pick: mark => (isBuiltinMark(mark) && mark.type === PlotMark.Point ? pointMarkValueChannel(mark.stroke) : undefined),
  }),
  label: {
    channel: 'label',
    kind: ChannelDefinitionKind.Mark,
    resolve: ctx => mark => {
      if (!isBuiltinMark(mark)) return undefined;
      const content = mark.type === PlotMark.Point && mark.encoding.text !== undefined ? mark.encoding.text : 'label' in mark ? mark.label?.content : undefined;
      const runtime = mark.id !== undefined ? options.resolveLabel?.[mark.id] : undefined;
      if (content === undefined && runtime === undefined) return undefined;
      const fieldType = content?.field !== undefined ? ctx.fieldTypes.get(content.field) : undefined;
      const effectiveContent = content ?? { value: '' };
      return { resolver: row => labelOf(effectiveContent, row, fieldType, runtime) };
    },
  },
});
