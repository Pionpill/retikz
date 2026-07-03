import type {
  AnyChannelDefinition,
  ChannelContext,
  ChannelDefinitionKindValue,
  MarkChannels,
  NodeChannelDelivery,
  PathChannelDelivery,
  ScaleDescriptor,
  ScopeChannelDelivery,
} from '../../contract';
import type { BuiltinTextChannelOptions } from './features';

import { ChannelDefinitionKind } from '../../contract';
import { type MarkOperation } from '../../schemas';
import { createBuiltinPaintChannels, createBuiltinTextChannels, DELIVERY_CHANNELS } from './features';

/**
 * 保留的内置通道名集：扩展通道的 `channel` 不得撞这些。
 * @description 含内置 mark / scope / node / path channel + 位置通道 x/y/z；同名内置通道可按 kind 注册多个 definition。
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
  'drawOpacity',
  'rotate',
  'padding',
  'minimumSize',
  'minimumWidth',
  'minimumHeight',
  'zIndex',
  'lineCap',
  'lineJoin',
  'roundedCorners',
  'align',
  'lineHeight',
  'maxTextWidth',
  'cornerRadius',
  'scale',
  'xScale',
  'yScale',
  'innerXSep',
  'innerYSep',
  'outerSep',
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

export type ChannelRegistryOptions = {
  custom?: ReadonlyArray<AnyChannelDefinition>;
  resolveLabel?: BuiltinTextChannelOptions['resolveLabel'];
};

const createBuiltinChannels = (options: BuiltinTextChannelOptions = {}): ReadonlyArray<AnyChannelDefinition> => [
  ...Object.values(createBuiltinPaintChannels()),
  ...Object.values(createBuiltinTextChannels(options)),
  ...DELIVERY_CHANNELS,
];

export type ChannelRegistry = Map<string, AnyChannelDefinition> & {
  readonly definitions: ReadonlyArray<AnyChannelDefinition>;
};

/**
 * 解析通道 registry：内置 definition 先注册，自定义 definition 再合并。
 * @description 所有通道类型共用一张 registry；kind 决定解析结果进入 mark values、scope/node/path deliveries，或由坐标系 role 消费。
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
      throw new Error(`lowerPlots: custom channel "${def.channel}" collides with a built-in channel name`);
    }
    if (definitions.some(registered => registered.channel === def.channel)) {
      throw new Error(`lowerPlots: duplicate custom channel registration: "${def.channel}"`);
    }
    if (
      (def.kind === ChannelDefinitionKind.Scope ||
        def.kind === ChannelDefinitionKind.Node ||
        def.kind === ChannelDefinitionKind.Path) &&
      typeof def.deliver !== 'function'
    ) {
      throw new Error(
        `lowerPlots: custom ${def.kind} channel "${def.channel}" must provide deliver (how its resolved value lands on the core ${def.kind})`,
      );
    }
    addDefinition(def);
  }
  Object.defineProperty(registry, 'definitions', { value: definitions, enumerable: false });
  return registry;
};

const extensionChannelsOf = (mark: MarkOperation): Record<string, unknown> =>
  (mark as { encoding?: { channels?: Record<string, unknown> } }).encoding?.channels ?? {};

/** 解析某 mark 可消费的所有通道。 */
export const resolveMarkChannels = (
  mark: MarkOperation,
  ctx: ChannelContext,
  registry: ReadonlyMap<string, AnyChannelDefinition> & { readonly definitions?: ReadonlyArray<AnyChannelDefinition> },
  defaultColor: string,
  channelKinds?: ReadonlySet<ChannelDefinitionKindValue>,
): MarkChannels => {
  for (const channel of Object.keys(extensionChannelsOf(mark))) {
    if (BUILTIN_CHANNEL_NAMES.has(channel)) {
      throw new Error(
        `lowerPlots: encoding.channels.${channel} collides with a built-in channel; use the named mark property instead`,
      );
    }
    if (!registry.has(channel)) {
      throw new Error(
        `lowerPlots: channel "${channel}" is not registered; pass a ChannelDefinition via options.channelDefinitions`,
      );
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

  for (const def of registry.definitions ?? registry.values()) {
    if (channelKinds !== undefined && !channelKinds.has(def.kind)) continue;
    if (def.kind === ChannelDefinitionKind.Mark) {
      const resolution = def.resolve(ctx)(mark);
      if (!resolution) continue;
      values[def.channel] = resolution.resolver;
      if (resolution.defaultValue !== undefined) defaults[def.channel] = resolution.defaultValue;
      registerDescriptor(resolution.descriptor);
      continue;
    }
    if (def.kind === ChannelDefinitionKind.Scope) {
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
