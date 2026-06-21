import {
  type AnyChannelDefinition,
  type ChannelContext,
  ChannelDefinitionKind,
  type MarkChannels,
  type NodeChannelDelivery,
  type PathChannelDelivery,
  type ScaleDescriptor,
  type ScopeChannelDelivery,
} from '../../contract';
import { type MarkOperation, isBuiltinMark } from '../../schemas';
import { type BuiltinMarkChannelOptions, createBuiltinMarkChannels } from './mark';
import { NODE_CHANNELS } from './node';

/**
 * 保留的内置通道名集：扩展通道的 `channel` 不得撞这些。
 * @description 含内置 mark channel + node channel + 位置通道 x/y/z；scope / path 目前主要作为自定义扩展面。
 */
export const BUILTIN_CHANNEL_NAMES: ReadonlySet<string> = new Set<string>([
  'x',
  'y',
  'z',
  'color',
  'fill',
  'stroke',
  'label',
  'size',
  'opacity',
  'shape',
  'strokeWidth',
  'fillOpacity',
  'drawOpacity',
  'rotate',
  'padding',
  'minimumSize',
  'minimumWidth',
  'minimumHeight',
  'zIndex',
]);

export type ChannelRegistryOptions = {
  custom?: ReadonlyArray<AnyChannelDefinition>;
  resolveLabel?: BuiltinMarkChannelOptions['resolveLabel'];
};

const createBuiltinChannels = (options: BuiltinMarkChannelOptions = {}): ReadonlyArray<AnyChannelDefinition> => [
  ...Object.values(createBuiltinMarkChannels(options)),
  ...NODE_CHANNELS,
];

/**
 * 解析通道 registry：内置 definition 先注册，自定义 definition 再合并。
 * @description 所有通道类型共用一张 registry；kind 决定解析结果进入 mark values、scope/node/path deliveries，或由坐标系 role 消费。
 */
export const resolveChannelRegistry = (options: ChannelRegistryOptions = {}): Map<string, AnyChannelDefinition> => {
  const registry = new Map<string, AnyChannelDefinition>();
  for (const def of createBuiltinChannels({ resolveLabel: options.resolveLabel })) {
    registry.set(def.channel, def);
  }
  for (const def of options.custom ?? []) {
    if (BUILTIN_CHANNEL_NAMES.has(def.channel)) {
      throw new Error(`lowerPlots: custom channel "${def.channel}" collides with a built-in channel name`);
    }
    if (registry.has(def.channel)) {
      throw new Error(`lowerPlots: duplicate custom channel registration: "${def.channel}"`);
    }
    if ((def.kind === ChannelDefinitionKind.Scope || def.kind === ChannelDefinitionKind.Node || def.kind === ChannelDefinitionKind.Path) && typeof def.deliver !== 'function') {
      throw new Error(`lowerPlots: custom ${def.kind} channel "${def.channel}" must provide deliver (how its resolved value lands on the core ${def.kind})`);
    }
    registry.set(def.channel, def);
  }
  return registry;
};

const extensionChannelsOf = (mark: MarkOperation): Record<string, unknown> =>
  (mark as { encoding?: { channels?: Record<string, unknown> } }).encoding?.channels ?? {};

/** 解析某 mark 可消费的所有通道。 */
export const resolveMarkChannels = (
  mark: MarkOperation,
  ctx: ChannelContext,
  registry: ReadonlyMap<string, AnyChannelDefinition>,
  defaultColor: string,
): MarkChannels => {
  if (isBuiltinMark(mark)) {
    for (const channel of Object.keys(extensionChannelsOf(mark))) {
      if (BUILTIN_CHANNEL_NAMES.has(channel)) {
        throw new Error(`lowerPlots: encoding.channels.${channel} collides with a built-in channel; use the named mark property instead`);
      }
      if (!registry.has(channel)) {
        throw new Error(`lowerPlots: channel "${channel}" is not registered; pass a ChannelDefinition via options.channelDefinitions`);
      }
    }
  }
  const values: Record<string, NonNullable<MarkChannels['values']>[string]> = {};
  const defaults: Record<string, NonNullable<MarkChannels['defaults']>[string]> = { color: defaultColor };
  const scopeDeliveries: Array<ScopeChannelDelivery> = [];
  const nodeDeliveries: Array<NodeChannelDelivery> = [];
  const pathDeliveries: Array<PathChannelDelivery> = [];
  const descriptors: Array<ScaleDescriptor> = [];
  const registerDescriptor = (descriptor: ScaleDescriptor | undefined): void => {
    if (descriptor !== undefined) descriptors.push(descriptor);
  };

  for (const def of registry.values()) {
    if (def.kind === ChannelDefinitionKind.Mark) {
      const resolution = def.resolve(ctx)(mark);
      if (!resolution) continue;
      values[def.channel] = resolution.resolver;
      if (resolution.defaultValue !== undefined) defaults[def.channel] = resolution.defaultValue;
      registerDescriptor(resolution.descriptor);
      continue;
    }
    if (def.kind === ChannelDefinitionKind.Scope) {
      if (!isBuiltinMark(mark)) continue;
      const resolution = def.resolve(ctx)(mark);
      if (!resolution) continue;
      scopeDeliveries.push({
        channel: def.channel,
        value: resolution.value,
        deliver: (scope, value, context) => def.deliver(scope, value as never, context),
      });
      registerDescriptor(resolution.descriptor);
      continue;
    }
    if (def.kind === ChannelDefinitionKind.Path) {
      if (!isBuiltinMark(mark)) continue;
      const resolution = def.resolve(ctx)(mark);
      if (!resolution) continue;
      pathDeliveries.push({
        channel: def.channel,
        resolver: resolution.resolver,
        deliver: (path, value, context) => def.deliver(path, value as never, context),
      });
      registerDescriptor(resolution.descriptor);
      continue;
    }
    if (def.kind !== ChannelDefinitionKind.Node) continue;
    if (!isBuiltinMark(mark)) continue;
    const resolution = def.resolve(ctx)(mark);
    if (!resolution) continue;
    nodeDeliveries.push({
      channel: def.channel,
      resolver: resolution.resolver,
      deliver: (node, value, context) => def.deliver(node, value as never, context),
    });
    registerDescriptor(resolution.descriptor);
  }

  return {
    values,
    defaults,
    scopeDeliveries,
    nodeDeliveries,
    pathDeliveries,
    descriptors,
  };
};
