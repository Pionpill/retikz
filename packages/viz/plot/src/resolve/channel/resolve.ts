import type {
  AnyChannelDefinition,
  ChannelDefinitionResolveContext,
  MarkChannels,
  NodeChannelDelivery,
  PathChannelDelivery,
  ScaleDescriptor,
  ScopeChannelDelivery,
} from '../../contract';
import type { IRPlotMarkOperation } from '../../schemas';
import type { ChannelResolveContext } from './types';

import { ChannelDefinitionKind } from '../../contract';
import { RetikzPlotError } from '../../error';
import { BUILTIN_CHANNEL_NAMES } from '../../providers';
import { resolveMarkOperation } from '../mark';

const extensionChannelsOf = (mark: IRPlotMarkOperation): Record<string, unknown> =>
  (mark as { encoding?: { channels?: Record<string, unknown> } }).encoding?.channels ?? {};

const assertChannelDelivery = (definition: AnyChannelDefinition): void => {
  if (
    (definition.kind === ChannelDefinitionKind.Scope ||
      definition.kind === ChannelDefinitionKind.Node ||
      definition.kind === ChannelDefinitionKind.Path) &&
    typeof definition.deliver !== 'function'
  ) {
    throw new RetikzPlotError(
      `lowerPlots: custom ${definition.kind} channel "${definition.channel}" must provide deliver (how its resolved value lands on the core ${definition.kind})`,
    );
  }
};

const definitionContextOf = (context: ChannelResolveContext): ChannelDefinitionResolveContext => ({
  node: context.node,
  rows: context.rows,
  fieldTypes: context.fieldTypes,
  ...(context.fieldTypeEvidence !== undefined ? { fieldTypeEvidence: context.fieldTypeEvidence } : {}),
  resolveChannelScale: context.resolveChannelScale,
  resolveCategoryDomain: context.resolveCategoryDomain,
  resolveColorScheme: context.resolveColorScheme,
  ...(context.palette !== undefined ? { palette: context.palette } : {}),
});

/** 查找 legend / guide 消费的 channel definition；具体输出能力由 resolve owner 统一提供 */
export const resolveChannelDefinition = (
  channel: string,
  context: { channelRegistry: ReadonlyMap<string, AnyChannelDefinition> },
): AnyChannelDefinition | undefined => context.channelRegistry.get(channel);

/** 解析当前 mark 可消费的 channel definition，并组装 values/default/delivery/descriptor */
export const resolveMarkChannels = (mark: IRPlotMarkOperation, context: ChannelResolveContext): MarkChannels => {
  const operationResolution = resolveMarkOperation(mark, { registry: context.markRegistry });
  const operation = operationResolution.operation;
  const channelKinds = operationResolution.definition.channelKinds?.(operation as never);
  for (const channel of Object.keys(extensionChannelsOf(mark))) {
    if (BUILTIN_CHANNEL_NAMES.has(channel)) {
      throw new RetikzPlotError(
        `lowerPlots: encoding.channels.${channel} collides with a built-in channel; use the named mark property instead`,
      );
    }
    if (!context.channelRegistry.has(channel)) {
      throw new RetikzPlotError(
        `lowerPlots: channel "${channel}" is not registered; pass a ChannelDefinition via options.channelDefinitions`,
      );
    }
  }
  const values: Record<string, NonNullable<MarkChannels['values']>[string]> = {};
  const defaults: Record<string, NonNullable<MarkChannels['defaults']>[string]> = { color: context.defaultColor };
  const scopeDeliveries: Array<ScopeChannelDelivery> = [];
  const nodeDeliveries: Array<NodeChannelDelivery> = [];
  const pathDeliveries: Array<PathChannelDelivery> = [];
  const descriptors: Array<ScaleDescriptor> = [];
  const registerDescriptor = (descriptor: ScaleDescriptor | undefined): void => {
    if (descriptor !== undefined) descriptors.push(descriptor);
  };
  const definitionContext = definitionContextOf(context);

  for (const definition of context.channelRegistry.definitions) {
    assertChannelDelivery(definition);
    if (channelKinds !== undefined && !channelKinds.has(definition.kind)) continue;
    if (definition.kind === ChannelDefinitionKind.Mark) {
      const resolution = definition.resolve(definitionContext)(mark);
      if (!resolution) continue;
      values[definition.channel] = resolution.resolver;
      if (resolution.defaultValue !== undefined) defaults[definition.channel] = resolution.defaultValue;
      registerDescriptor(resolution.descriptor);
      continue;
    }
    if (definition.kind === ChannelDefinitionKind.Scope) {
      const resolution = definition.resolve(definitionContext)(mark);
      if (!resolution) continue;
      scopeDeliveries.push({
        channel: definition.channel,
        value: resolution.value,
        deliver: (scope, value, deliveryContext) => definition.deliver(scope, value as never, deliveryContext),
      });
      registerDescriptor(resolution.descriptor);
      continue;
    }
    if (definition.kind === ChannelDefinitionKind.Path) {
      const resolution = definition.resolve(definitionContext)(mark);
      if (!resolution) continue;
      pathDeliveries.push({
        channel: definition.channel,
        resolver: resolution.resolver,
        deliver: (path, value, deliveryContext) => definition.deliver(path, value as never, deliveryContext),
      });
      registerDescriptor(resolution.descriptor);
      continue;
    }
    if (definition.kind !== ChannelDefinitionKind.Node) continue;
    const resolution = definition.resolve(definitionContext)(mark);
    if (!resolution) continue;
    nodeDeliveries.push({
      channel: definition.channel,
      resolver: resolution.resolver,
      deliver: (node, value, deliveryContext) => definition.deliver(node, value as never, deliveryContext),
    });
    registerDescriptor(resolution.descriptor);
  }

  return { values, defaults, scopeDeliveries, nodeDeliveries, pathDeliveries, descriptors };
};
