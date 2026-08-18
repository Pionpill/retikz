import type { AnyChannelDefinition } from '../../contract';
import type { BuiltinTextChannelOptions } from './features';

import { RetikzPlotError } from '../../error';
import { createBuiltinPaintChannels, createBuiltinTextChannels, DELIVERY_CHANNELS } from './features';

/**
 * 保留的内置通道名集：扩展通道的 `channel` 不得撞这些。
 * @description 含内置 mark / scope / node / path channel + 位置通道 x/y/z；同名内置通道可按 kind 注册多个 definition
 */
export const BUILTIN_CHANNEL_NAMES: ReadonlySet<string> = new Set<string>([
  'x',
  'y',
  'z',
  'color',
  'textColor',
  'fill',
  'stroke',
  'label',
  'size',
  'opacity',
  'shape',
  'strokeWidth',
  'fillOpacity',
  'strokeOpacity',
  'rotate',
  'padding',
  'minimumSize',
  'zIndex',
  'lineCap',
  'lineJoin',
  'roundedCorners',
  'align',
  'lineHeight',
  'maxTextWidth',
  'cornerRadius',
  'scale',
  'margin',
  'dashed',
  'dotted',
  'dashPattern',
  'font',
  'boundary',
  'shadow',
  'blendMode',
  'fillRule',
  'thickness',
]);

/** 解析通道 registry 时可传入的自定义 definition 与文本选项 */
export type ChannelRegistryOptions = {
  custom?: ReadonlyArray<AnyChannelDefinition>;
  resolveLabel?: BuiltinTextChannelOptions['resolveLabel'];
};

const createBuiltinChannels = (options: BuiltinTextChannelOptions = {}): ReadonlyArray<AnyChannelDefinition> => [
  ...Object.values(createBuiltinPaintChannels()),
  ...Object.values(createBuiltinTextChannels(options)),
  ...DELIVERY_CHANNELS,
];

/** 包含 definition 顺序视图的通道 registry */
export type ChannelRegistry = Map<string, AnyChannelDefinition> & {
  readonly definitions: ReadonlyArray<AnyChannelDefinition>;
};

/**
 * 解析通道 registry：内置 definition 先注册，自定义 definition 再合并。
 * @description 所有通道类型共用一张 registry；kind 决定解析结果进入 mark values、scope/node/path deliveries，或由坐标系 role 消费
 */
export const resolveChannelRegistry = (options: ChannelRegistryOptions = {}): ChannelRegistry => {
  const registry = new Map<string, AnyChannelDefinition>() as ChannelRegistry;
  const definitions: Array<AnyChannelDefinition> = [];
  const addDefinition = (def: AnyChannelDefinition): void => {
    if (def.channel.trim() === '') {
      throw new RetikzPlotError('lowerPlots: channel definition must use a non-empty channel name');
    }
    definitions.push(def);
    if (!registry.has(def.channel)) registry.set(def.channel, def);
  };
  for (const def of createBuiltinChannels({ resolveLabel: options.resolveLabel })) {
    addDefinition(def);
  }
  for (const def of options.custom ?? []) {
    if (BUILTIN_CHANNEL_NAMES.has(def.channel)) {
      throw new RetikzPlotError(`lowerPlots: custom channel "${def.channel}" collides with a built-in channel name`);
    }
    if (definitions.some(registered => registered.channel === def.channel)) {
      throw new RetikzPlotError(`lowerPlots: duplicate custom channel registration: "${def.channel}"`);
    }
    addDefinition(def);
  }
  Object.defineProperty(registry, 'definitions', { value: definitions, enumerable: false });
  return registry;
};
