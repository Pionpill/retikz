import { type AnyChannelDefinition, type AnyVisualChannelDefinition, type MarkChannelDefinition, type ResolveLabel, type VisualChannelDefinition } from '../../contract';
import { labelOf } from '../data';
import { type Channel, PlotMark, isBuiltinMark } from '../../schemas';
import { makeColorChannelDefinition } from './mark';
import { numericVisualChannels } from './numeric';
import { shapeVisualChannel } from './shape';
import { sizeVisualChannel } from './size';

export type BuiltinVisualChannels = {
  opacity: VisualChannelDefinition<number>;
  fillOpacity: VisualChannelDefinition<number>;
  drawOpacity: VisualChannelDefinition<number>;
  rotate: VisualChannelDefinition<number>;
  padding: VisualChannelDefinition<number>;
  minimumSize: VisualChannelDefinition<number>;
  minimumWidth: VisualChannelDefinition<number>;
  minimumHeight: VisualChannelDefinition<number>;
  zIndex: VisualChannelDefinition<number>;
  size: VisualChannelDefinition<number>;
  shape: VisualChannelDefinition<string>;
  strokeWidth: VisualChannelDefinition<number>;
};

/**
 * 内置视觉通道定义：scale 管数学、visual channel 管输出空间 + 默认范围 + legend 形态。
 * @description 内置和自定义通道在 lowering 前合并进同一个 registry；差别只在 definition 来源。
 */
export const BUILTIN_VISUAL_CHANNELS: BuiltinVisualChannels = {
  ...numericVisualChannels,
  size: sizeVisualChannel,
  shape: shapeVisualChannel,
};

const eraseVisualChannelDefinition = (def: unknown): AnyVisualChannelDefinition => def as AnyVisualChannelDefinition;

export const VISUAL_CHANNELS: ReadonlyArray<AnyVisualChannelDefinition> = Object.values(BUILTIN_VISUAL_CHANNELS).map(def => eraseVisualChannelDefinition(def));

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
    kind: 'mark',
    resolve: ctx => mark => {
        if (!isBuiltinMark(mark)) return undefined;
        const content = mark.type === PlotMark.Point && mark.encoding.text !== undefined ? mark.encoding.text : 'label' in mark ? mark.label?.content : undefined;
        const runtime = mark.id !== undefined ? options.resolveLabel?.[mark.id] : undefined;
        if (content === undefined && runtime === undefined) return undefined;
        const fieldType = content?.field !== undefined ? ctx.fieldTypes.get(content.field) : undefined;
        const effectiveContent = content ?? { value: '' };
        return { of: row => labelOf(effectiveContent, row, fieldType, runtime) };
      },
  },
});

export const createBuiltinChannels = (options: BuiltinMarkChannelOptions = {}): ReadonlyArray<AnyChannelDefinition> => [
  ...Object.values(createBuiltinMarkChannels(options)),
  ...VISUAL_CHANNELS,
];
