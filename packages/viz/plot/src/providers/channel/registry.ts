import type { AnyChannelDefinition } from '../../contract';
import { RetikzPlotError } from '../../error';
import type { BuiltinTextChannelOptions } from './features';
import { createBuiltinPaintChannels, createBuiltinTextChannels, DELIVERY_CHANNELS, LABEL_CHANNELS } from './features';

/**
 * 保留的内置通道名集：扩展通道的 `channel` 不得撞这些
 * @description 含内置 mark / scope / node / path channel + 位置通道 x/y/z；同名内置通道可按 kind 注册多个 definition
 */
export const BUILTIN_CHANNEL_NAMES: ReadonlySet<string> = new Set<string>([
  ...LABEL_CHANNELS.map(definition => definition.channel),
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
  'cornerRadius',
  'align',
  'lineHeight',
  'maxTextWidth',
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
  'pull',
  'geometry.width',
  'geometry.endWidth',
]);

/** 解析通道 registry 时可传入的自定义 definition 与文本选项 */
export type ChannelRegistryOptions = {
  /** 加入当前注册表的自定义通道定义 */
  custom?: ReadonlyArray<AnyChannelDefinition>;
  /** 按 mark id 注入内置标签通道的运行时回调 */
  resolveLabel?: BuiltinTextChannelOptions['resolveLabel'];
};

const createBuiltinChannels = (options: BuiltinTextChannelOptions = {}): ReadonlyArray<AnyChannelDefinition> => [
  ...Object.values(createBuiltinPaintChannels()),
  ...Object.values(createBuiltinTextChannels(options)),
  ...DELIVERY_CHANNELS,
  ...LABEL_CHANNELS,
];

/** 包含 definition 顺序视图的通道 registry */
export type ChannelRegistry = Map<string, AnyChannelDefinition> & {
  /** 当前注册表持有的完整通道定义列表 */
  readonly definitions: ReadonlyArray<AnyChannelDefinition>;
};

/**
 * 解析通道 registry：内置 definition 先注册，自定义 definition 再合并
 * @description 名称索引保留首个同名内置定义；definitions 保留全部定义和注册顺序
 * @param options 自定义定义与标签回调；省略时仅注册内置定义
 * @returns 新建的名称索引及其完整定义列表
 * @throws {RetikzPlotError} 自定义名称重复或与内置保留名称冲突
 */
export const resolveChannelRegistry = (options: ChannelRegistryOptions = {}): ChannelRegistry => {
  const registry = new Map<string, AnyChannelDefinition>() as ChannelRegistry;
  const definitions: Array<AnyChannelDefinition> = [];

  const addDefinition = (def: AnyChannelDefinition): void => {
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
