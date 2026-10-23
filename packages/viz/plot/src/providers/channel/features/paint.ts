import type { IRPaintValue } from '@retikz/core';
import { coerceTimestamp, resolveFieldPath } from '@retikz/data';
import { DataFieldType, BuiltinFieldOrderMode } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type { ChannelScaleResolveContext, MarkChannelDefinition } from '../../../contract';
import type { ChannelPaletteContext } from '../../../contract';
import {
  channelField,
  channelScale,
  markChannelEncoding,
  markProperty,
  ChannelDefinitionKind,
  isBuiltinScaleOperation,
} from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotChannel, IRPlotMark, IRPlotScaleOperation } from '../../../schemas';
import { BuiltinPlotScale } from '../../../schemas';

/** 颜色通道 definition 的名称、取值与图例配置 */
export type ColorChannelDefinitionOptions = {
  /** 创建的颜色类通道名称 */
  channel: string;
  /** 从 mark 中读取该通道的绑定 */
  pick: (mark: IRPlotMark) => IRPlotChannel | undefined;
  /** 无有效字段编码时使用的固定 paint 属性 */
  property?: (mark: IRPlotMark) => PlotPaint | undefined;
};

/** plot 通道可下沉到 core 的颜色或 paint 值 */
export type PlotPaint = IRPaintValue;

/**
 * 创建 color-like mark 通道（color / fill / stroke）
 * @description 常量 value 直返；字段值经 channel scale registry 取色。连续 / temporal 字段必须显式引用 color scale
 * @param options 通道名称、绑定读取函数与常量 paint 策略
 * @returns 使用颜色比例尺解析字段的 mark 通道定义；创建时不解析数据
 */
export const makeColorChannelDefinition = (
  options: ColorChannelDefinitionOptions,
): MarkChannelDefinition<PlotPaint> => ({
  channel: options.channel,
  kind: ChannelDefinitionKind.Mark,
  resolve: (ctx, mark) => {
    const scaleByName = new Map(ctx.node.scales.map(scale => [scale.name, scale] as const));
    const channel = options.pick(mark);
    if (channel === undefined) {
      const property = options.property?.(mark);
      return property === undefined ? undefined : { resolver: () => property, defaultValue: property };
    }
    const field = channelField(channel);
    const scaleName = channelScale(channel);
    const definition = ctx.model.find(candidate => candidate.name === field);
    const colorFieldType = definition?.type;
    if (
      (colorFieldType === DataFieldType.Continuous || colorFieldType === DataFieldType.Temporal) &&
      scaleName === undefined
    ) {
      throw new RetikzPlotError(
        `lowerPlots: continuous/temporal ${options.channel} field "${field}" requires an explicit sequential/diverging/quantize/threshold/quantile color scale reference`,
      );
    }

    let scaleOperation: IRPlotScaleOperation;
    if (scaleName !== undefined) {
      const found = scaleByName.get(scaleName);
      if (!found)
        throw new RetikzPlotError(`lowerPlots: ${options.channel} channel references unknown scale "${scaleName}"`);

      scaleOperation = found;
    } else {
      scaleOperation = { type: BuiltinPlotScale.Ordinal, name: `__${options.channel}_${field}` };
    }

    const rawValues = ctx.rows.map(row => resolveFieldPath(row, field));
    if (
      isBuiltinScaleOperation(scaleOperation) &&
      scaleOperation.type === BuiltinPlotScale.Ordinal &&
      scaleOperation.domain === undefined
    ) {
      const order = definition?.order;
      if (order !== undefined && order !== BuiltinFieldOrderMode.Appearance) {
        scaleOperation = { ...scaleOperation, domain: ctx.resolveCategoryDomain(rawValues, order) };
      }
    }

    const resolution = ctx.resolveChannelScale(
      scaleOperation,
      rawValues,
      colorResolveContext(colorFieldType, ctx.resolveColorScheme, ctx.palette),
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
  },
});

const colorResolveContext = (
  fieldType: DataFieldType | undefined,
  resolveColorScheme: (name: string) => (t: number) => string,
  palette: ChannelPaletteContext | undefined,
): ChannelScaleResolveContext => ({
  fieldType,
  toNumber: value => (isFiniteNumber(value) ? value : null),
  coerceTimestamp,
  resolveColorScheme,
  defaultColors: palette?.categorical,
  defaultSequentialScheme: palette?.sequential,
  defaultDivergingScheme: palette?.diverging,
});

/** 内置 paint 通道 definition 的按名称索引类型 */
export type BuiltinPaintChannels = {
  /** 供 mark 消费的主颜色通道 */
  color: MarkChannelDefinition<PlotPaint>;
  /** 供 mark 消费的填充通道 */
  fill: MarkChannelDefinition<PlotPaint>;
  /** 供 mark 消费的描边通道 */
  stroke: MarkChannelDefinition<PlotPaint>;
};

/**
 * 创建内置 paint channel definitions
 * @returns 新建的 color、fill、stroke 通道定义集合
 */
export const createBuiltinPaintChannels = (): BuiltinPaintChannels => ({
  color: makeColorChannelDefinition({
    channel: 'color',
    pick: mark => markChannelEncoding(mark, 'color'),
    property: mark => markProperty<PlotPaint>(mark, 'color'),
  }),
  fill: makeColorChannelDefinition({
    channel: 'fill',
    pick: mark => markChannelEncoding(mark, 'fill'),
    property: mark => markProperty<PlotPaint>(mark, 'fill'),
  }),
  stroke: makeColorChannelDefinition({
    channel: 'stroke',
    pick: mark => markChannelEncoding(mark, 'stroke'),
    property: mark => markProperty<PlotPaint>(mark, 'stroke'),
  }),
});
