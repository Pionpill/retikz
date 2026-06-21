import { isFiniteNumber } from '@retikz/math';
import { type ChannelResolution, type VisualChannelDefinition, defineVisualChannel, isBuiltinScaleOperation } from '../../contract';
import { resolveFieldPath } from '../data';
import { type ExternalRow, type LinearScale, type Mark, PlotFieldType, type PlotFieldTypeMap, PlotMark, PlotScale, type PlotSpec, type ScaledMarkValueType } from '../../schemas';
import { resolveLinearScale } from '../scale/position';
import { makeMarkValueResolver } from './common';

/** opacity 通道连续映射的最小不透明度（range 下界，避免最小值全透明不可见）；契约常量，测试 import 断言 */
export const OPACITY_MIN = 0.2;

/** strokeWidth 通道连续映射的最小 / 最大描边宽度（user units）；避免最小值落成不可见边框 */
export const STROKE_WIDTH_MIN = 0.5;
export const STROKE_WIDTH_MAX = 4;

export type NumericStyleResolverOptions = {
  range?: readonly [number, number];
  clamp?: boolean;
  integer?: boolean;
};

/**
 * 解析 PointMark 的数值样式字段 → 行→数值（opacity / strokeWidth / fillOpacity / rotate / padding / zIndex… 共享基型）
 * @description field 变体若给 scale 或默认 range，则过 linear scale；否则直接使用字段原始有限数。
 *   非 continuous 字段（temporal / categorical）fail-loud；constant 变体由 nodeDefault / node 本身处理，不在这里产 resolver。
 */
export const makeNumericStyleResolver = (
  node: PlotSpec,
  rows: Array<ExternalRow>,
  fieldTypes: PlotFieldTypeMap,
  pick: (mark: Mark) => ScaledMarkValueType<number> | undefined,
  channelName: string,
  options: NumericStyleResolverOptions = {},
): ((mark: Mark) => ChannelResolution<number> | undefined) => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return (mark: Mark): ChannelResolution<number> | undefined => {
    const channel = pick(mark);
    if (!channel) return undefined;
    const source = makeMarkValueResolver<number>(channel, fieldTypes, {
      channelName,
      expectedFieldType: PlotFieldType.Continuous,
      parse: value => (isFiniteNumber(value) ? value : undefined),
      constants: 'skip',
    });
    if (!source) return undefined;
    const field = source.field;
    if (field === undefined) return undefined;
    const fieldType = source.fieldType;
    const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
    let scale: ((value: number) => number) | undefined;
    if (channel.scale !== undefined || options.range !== undefined) {
      let def: LinearScale = { type: PlotScale.Linear, name: channel.scale ?? `__${channelName}_${field}`, ...(options.range !== undefined ? { range: [options.range[0], options.range[1]] as [number, number] } : {}), ...(options.clamp !== undefined ? { clamp: options.clamp } : {}) };
      if (channel.scale !== undefined) {
        const found = scaleByName.get(channel.scale);
        if (!found) throw new Error(`lowerPlots: ${channelName} style references unknown scale "${channel.scale}"`);
        if (!isBuiltinScaleOperation(found) || found.type !== PlotScale.Linear) throw new Error(`lowerPlots: ${channelName} style scale "${channel.scale}" must be a linear scale`);
        def = { ...found, range: found.range ?? def.range, clamp: found.clamp ?? def.clamp };
      }
      scale = resolveLinearScale(def, numeric, options.range ?? [0, 1]);
    }
    const domain: [number, number] = numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)];
    const descriptor =
      channelName === 'opacity' && options.range !== undefined
        ? { channel: 'opacity' as const, scaleType: PlotScale.Linear, domain, range: [options.range[0], options.range[1]], field, fieldType }
        : undefined;
    return {
      of: row => {
        const value = source.of(row);
        if (value === undefined) return undefined;
        const next = scale ? scale(value) : value;
        return options.integer ? Math.trunc(next) : next;
      },
      descriptor,
    };
  };
};

export const numericVisualChannels: {
  opacity: VisualChannelDefinition<number>;
  fillOpacity: VisualChannelDefinition<number>;
  drawOpacity: VisualChannelDefinition<number>;
  rotate: VisualChannelDefinition<number>;
  padding: VisualChannelDefinition<number>;
  minimumSize: VisualChannelDefinition<number>;
  minimumWidth: VisualChannelDefinition<number>;
  minimumHeight: VisualChannelDefinition<number>;
  zIndex: VisualChannelDefinition<number>;
  strokeWidth: VisualChannelDefinition<number>;
} = {
  opacity: defineVisualChannel<number>({
    channel: 'opacity',
    output: { outputKind: 'number', range: [OPACITY_MIN, 1], clamp: true },
    legend: 'ramp',
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.opacity : undefined), 'opacity', { range: [OPACITY_MIN, 1], clamp: true }),
    deliver: (node, value) => {
      node.opacity = value;
    },
  }),
  fillOpacity: defineVisualChannel<number>({
    channel: 'fillOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.fillOpacity : undefined), 'fillOpacity', { range: [0.2, 1], clamp: true }),
    deliver: (node, value) => {
      node.fillOpacity = value;
    },
  }),
  drawOpacity: defineVisualChannel<number>({
    channel: 'drawOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.drawOpacity : undefined), 'drawOpacity', { range: [0.2, 1], clamp: true }),
    deliver: (node, value) => {
      node.drawOpacity = value;
    },
  }),
  rotate: defineVisualChannel<number>({
    channel: 'rotate',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.rotate : undefined), 'rotate'),
    deliver: (node, value) => {
      node.rotate = value;
    },
  }),
  padding: defineVisualChannel<number>({
    channel: 'padding',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.padding : undefined), 'padding'),
    deliver: (node, value) => {
      node.padding = value;
    },
  }),
  minimumSize: defineVisualChannel<number>({
    channel: 'minimumSize',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.minimumSize : undefined), 'minimumSize'),
    deliver: (node, value) => {
      node.minimumSize = value;
    },
  }),
  minimumWidth: defineVisualChannel<number>({
    channel: 'minimumWidth',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.minimumWidth : undefined), 'minimumWidth'),
    deliver: (node, value) => {
      node.minimumWidth = value;
    },
  }),
  minimumHeight: defineVisualChannel<number>({
    channel: 'minimumHeight',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.minimumHeight : undefined), 'minimumHeight'),
    deliver: (node, value) => {
      node.minimumHeight = value;
    },
  }),
  zIndex: defineVisualChannel<number>({
    channel: 'zIndex',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.zIndex : undefined), 'zIndex', { integer: true }),
    deliver: (node, value) => {
      node.zIndex = value;
    },
  }),
  strokeWidth: defineVisualChannel<number>({
    channel: 'strokeWidth',
    output: { outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.strokeWidth : undefined), 'strokeWidth', { range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true }),
    deliver: (node, value, context) => {
      if (context.nodeKind === 'pointGlyph') node.strokeWidth = value;
    },
  }),
};
