import { isFiniteNumber } from '@retikz/math';
import { type ChannelResolveContext, type MarkChannelDefinition, isBuiltinScaleOperation } from '../../contract';
import { coerceTimestamp, resolveFieldPath } from '../data';
import { type Channel, type MarkOperation, PlotFieldType, type PlotFieldTypeMap, PlotMark, PlotScale, type PlotSpec, type ScaleOperation } from '../../schemas';
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
  kind: 'mark',
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
        return { of: () => constant };
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
        of: row => resolution.of(resolveFieldPath(row, field)),
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
