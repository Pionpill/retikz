import {
  type AnyChannelDefinition,
  type AnyVisualChannelDefinition,
  type ChannelContext,
  type ChannelDelivery,
  type MarkChannels,
  type ScaleDescriptor,
  type VisualChannelContext,
  type VisualChannelDefinition,
} from '../../contract';
import { type Mark, type MarkOperation, PlotMark, isBuiltinMark } from '../../schemas';
import { VISUAL_CHANNELS, createBuiltinChannels } from './definitions';

/**
 * 保留的内置通道名集：扩展通道的 `channel` 不得撞这些。
 * @description 含内置 mark channel + visual channel + 位置通道 x/y/z；位置角色还由 CoordinateDefinition.roles 决定。
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

/** @deprecated Use BUILTIN_CHANNEL_NAMES. */
export const BUILTIN_VISUAL_CHANNEL_NAMES = BUILTIN_CHANNEL_NAMES;

export type ChannelRegistryOptions = {
  custom?: ReadonlyArray<AnyChannelDefinition>;
  legacyVisual?: ReadonlyArray<AnyVisualChannelDefinition | VisualChannelDefinition>;
  resolveLabel?: Parameters<typeof createBuiltinChannels>[0] extends infer TOptions ? TOptions extends { resolveLabel?: infer TResolveLabel } ? TResolveLabel : never : never;
};

const asVisualChannelDefinition = (def: AnyVisualChannelDefinition | VisualChannelDefinition): AnyVisualChannelDefinition => {
  if ('kind' in def) return def;
  return { ...(def as VisualChannelDefinition), kind: 'visual' };
};

const asChannelDefinition = (def: AnyChannelDefinition | AnyVisualChannelDefinition | VisualChannelDefinition): AnyChannelDefinition => {
  if ('kind' in def) return def;
  return asVisualChannelDefinition(def);
};

/**
 * 解析通道 registry：内置 definition 先注册，自定义 definition 再合并。
 * @description 所有通道类型共用一张 registry；kind 决定解析结果进入 mark values、visual deliveries，或由坐标系 role 消费。
 */
export const resolveChannelRegistry = (options: ChannelRegistryOptions = {}): Map<string, AnyChannelDefinition> => {
  const registry = new Map<string, AnyChannelDefinition>();
  for (const def of createBuiltinChannels({ resolveLabel: options.resolveLabel })) {
    registry.set(def.channel, def);
  }
  const customDefinitions: ReadonlyArray<AnyChannelDefinition | AnyVisualChannelDefinition | VisualChannelDefinition> = [...(options.legacyVisual ?? []), ...(options.custom ?? [])];
  for (const def of customDefinitions) {
    const next = asChannelDefinition(def);
    if (BUILTIN_CHANNEL_NAMES.has(next.channel)) {
      throw new Error(`lowerPlots: custom channel "${next.channel}" collides with a built-in channel name`);
    }
    if (registry.has(next.channel)) {
      throw new Error(`lowerPlots: duplicate custom visual channel registration: "${next.channel}"`);
    }
    if (next.kind === 'visual' && typeof next.deliver !== 'function') {
      throw new Error(`lowerPlots: custom visual channel "${next.channel}" must provide deliver (how its resolved value lands on the node)`);
    }
    registry.set(next.channel, next);
  }
  return registry;
};

/**
 * 兼容旧视觉通道 registry。
 * @deprecated Use resolveChannelRegistry and filter `kind === 'visual'`.
 */
export const resolveVisualChannelRegistry = (custom?: ReadonlyArray<AnyVisualChannelDefinition>): Map<string, AnyVisualChannelDefinition> => {
  const registry = new Map<string, AnyVisualChannelDefinition>();
  for (const def of VISUAL_CHANNELS) {
    registry.set(def.channel, def);
  }
  for (const def of custom ?? []) {
    const next = asVisualChannelDefinition(def);
    if (BUILTIN_CHANNEL_NAMES.has(next.channel)) {
      throw new Error(`lowerPlots: custom visual channel "${next.channel}" collides with a built-in channel name`);
    }
    if (registry.has(next.channel)) {
      throw new Error(`lowerPlots: duplicate custom visual channel registration: "${next.channel}"`);
    }
    if (typeof next.deliver !== 'function') {
      throw new Error(`lowerPlots: custom visual channel "${next.channel}" must provide deliver (how its resolved value lands on the node)`);
    }
    registry.set(next.channel, next);
  }
  return registry;
};

/** 解析某 mark 可消费的所有通道。 */
export const resolveMarkChannels = (
  mark: MarkOperation,
  ctx: ChannelContext,
  registry: ReadonlyMap<string, AnyChannelDefinition>,
  defaultColor: string,
): MarkChannels => {
  if (isBuiltinMark(mark) && mark.type === PlotMark.Point) {
    for (const channel of Object.keys(mark.encoding.channels ?? {})) {
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
  const deliveries: Array<ChannelDelivery> = [];
  const descriptors: Array<ScaleDescriptor> = [];
  const registerDescriptor = (descriptor: ScaleDescriptor | undefined): void => {
    if (descriptor !== undefined) descriptors.push(descriptor);
  };

  for (const def of registry.values()) {
    if (def.kind === 'mark') {
      const resolution = def.resolve(ctx)(mark);
      if (!resolution) continue;
      values[def.channel] = resolution.of;
      if (resolution.defaultValue !== undefined) defaults[def.channel] = resolution.defaultValue;
      registerDescriptor(resolution.descriptor);
      continue;
    }
    if (def.kind !== 'visual') continue;
    if (!isBuiltinMark(mark)) continue;
    const resolution = def.resolve(ctx)(mark);
    if (!resolution) continue;
    deliveries.push({ channel: def.channel, of: resolution.of, deliver: (node, value, context) => def.deliver(node, value as never, context) });
    registerDescriptor(resolution.descriptor);
  }

  return {
    values,
    defaults,
    deliveries,
    descriptors,
  };
};

/**
 * 建某 mark 的视觉通道交付项（值 + 落地同源）。
 * @deprecated Use resolveMarkChannels.
 */
export const resolveVisualChannelDeliveries = (mark: Mark, ctx: VisualChannelContext, registry: ReadonlyMap<string, AnyVisualChannelDefinition>): Array<ChannelDelivery> => {
  if (mark.type !== PlotMark.Point) return [];
  for (const channel of Object.keys(mark.encoding.channels ?? {})) {
    if (BUILTIN_CHANNEL_NAMES.has(channel)) {
      throw new Error(`lowerPlots: encoding.channels.${channel} collides with a built-in channel; use the named mark property instead`);
    }
    if (!registry.has(channel)) {
      throw new Error(`lowerPlots: channel "${channel}" is not registered; pass a ChannelDefinition via options.channelDefinitions`);
    }
  }
  const out: Array<ChannelDelivery> = [];
  for (const def of registry.values()) {
    const resolution = def.resolve(ctx)(mark);
    if (!resolution) continue;
    out.push({ channel: def.channel, of: resolution.of, deliver: (node, value, context) => def.deliver(node, value as never, context) });
  }
  return out;
};
