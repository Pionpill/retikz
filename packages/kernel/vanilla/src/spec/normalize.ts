import type { CompositeDefinition, IRChild, IRScene, IRScope } from '@retikz/core';

import type {
  VanillaChildSpec,
  VanillaEmbedSpec,
  VanillaFigureSpec,
  VanillaLayerMeta,
  VanillaLayerSpec,
  VanillaNormalizedFigure,
  VanillaNormalizeOptions,
  VanillaRuntimeMeta,
  VanillaTier2Contribution,
} from './types';

import { DEFAULT_LAYER_ID, VanillaLayerCache } from './constants';

type ContributionRecord = {
  namespace: string;
  datasets: Record<string, unknown>;
  makeComposites: (mergedDatasets: Record<string, unknown>) => Array<CompositeDefinition>;
};

type NormalizeContext = {
  layerId: string;
  parentId: string;
  path: Array<string>;
  adapters: VanillaNormalizeOptions['adapters'];
  contributions: Array<ContributionRecord>;
  identityIndex: Map<string, Array<string>>;
  parentIndex: Map<string, string>;
};

type AdapterOutputContext = NormalizeContext & {
  embedId: string;
  parentId: string;
  path: Array<string>;
};

/** 判断输入是否为 Vanilla figure spec。 */
export const isVanillaFigureSpec = (input: unknown): input is VanillaFigureSpec =>
  typeof input === 'object' &&
  input !== null &&
  (input as { type?: unknown }).type === 'figure' &&
  (input as { version?: unknown }).version === 1;

const hasChildren = (input: VanillaFigureSpec): input is VanillaFigureSpec & { children: Array<VanillaChildSpec> } =>
  'children' in input;

const asLayerStack = (figure: VanillaFigureSpec): Array<VanillaLayerSpec> => {
  const layers = hasChildren(figure)
    ? [{ type: 'layer' as const, id: DEFAULT_LAYER_ID, cache: VanillaLayerCache.Auto, children: figure.children }]
    : figure.layers;
  return layers
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry.zIndex ?? 0) - (b.entry.zIndex ?? 0) || a.index - b.index)
    .map(({ entry }) => entry);
};

const registerIdentity = (
  id: string | undefined,
  parentId: string,
  path: Array<string>,
  ctx: NormalizeContext,
): void => {
  if (id === undefined) return;
  if (ctx.identityIndex.has(id)) {
    throw new Error(`vanilla spec duplicate identity "${id}" at ${path.join(' > ')}`);
  }
  ctx.identityIndex.set(id, path);
  ctx.parentIndex.set(id, parentId);
};

const isEmbed = (child: VanillaChildSpec): child is VanillaEmbedSpec => child.type === 'embed';

const isScope = (child: IRChild): child is IRScope =>
  child.type === 'scope' && !('namespace' in child) && Array.isArray((child as { children?: unknown }).children);

const readIdentity = (child: IRChild): string | undefined =>
  'id' in child && typeof child.id === 'string' ? child.id : undefined;

const aggregateComposites = (contributions: ReadonlyArray<ContributionRecord>): Array<CompositeDefinition> => {
  const groups = new Map<
    string,
    { merged: Record<string, unknown>; maker: (merged: Record<string, unknown>) => Array<CompositeDefinition> }
  >();
  for (const contribution of contributions) {
    let group = groups.get(contribution.namespace);
    if (!group) {
      group = { merged: {}, maker: contribution.makeComposites };
      groups.set(contribution.namespace, group);
    } else if (group.maker !== contribution.makeComposites) {
      throw new Error(`vanilla spec namespace "${contribution.namespace}" received multiple makeComposites functions.`);
    }
    for (const [reference, value] of Object.entries(contribution.datasets)) {
      if (reference in group.merged && group.merged[reference] !== value) {
        throw new Error(
          `vanilla spec dataset reference conflict in namespace "${contribution.namespace}" for "${reference}".`,
        );
      }
      group.merged[reference] = value;
    }
  }
  const out: Array<CompositeDefinition> = [];
  for (const group of groups.values()) out.push(...group.maker(group.merged));
  return out;
};

const registerAdapterOutputIdentity = (id: string | undefined, ctx: AdapterOutputContext): void => {
  if (id === undefined) return;
  const requiredPrefix = `${ctx.embedId}/`;
  if (!id.startsWith(requiredPrefix)) {
    throw new Error(`vanilla spec adapter output id "${id}" must start with "${requiredPrefix}".`);
  }
  registerIdentity(id, ctx.parentId, [...ctx.path, id], ctx);
};

const validateAdapterOutputIdentities = (child: IRChild, ctx: AdapterOutputContext): void => {
  const identity = readIdentity(child);
  registerAdapterOutputIdentity(identity, ctx);
  if (!isScope(child)) return;

  const scopeParentId = identity ?? ctx.parentId;
  const scopePath = identity === undefined ? ctx.path : [...ctx.path, identity];
  const childCtx: AdapterOutputContext = { ...ctx, parentId: scopeParentId, path: scopePath };
  for (const scopeChild of child.children) validateAdapterOutputIdentities(scopeChild, childCtx);
};

const lowerEmbed = (embed: VanillaEmbedSpec, ctx: NormalizeContext): IRChild => {
  const adapter = ctx.adapters?.find(entry => entry.kind === embed.kind);
  if (!adapter) {
    throw new Error(`vanilla spec embed "${embed.id}" uses kind "${embed.kind}" but no adapter was provided.`);
  }
  const contribution: VanillaTier2Contribution = adapter.lower(embed.props as never, {
    id: embed.id,
    kind: embed.kind,
    namespace: adapter.namespace,
    layerId: ctx.layerId,
    identityPath: [...ctx.path, embed.id],
  });
  ctx.contributions.push({
    namespace: adapter.namespace,
    datasets: contribution.datasets,
    makeComposites: contribution.makeComposites,
  });
  validateAdapterOutputIdentities(contribution.node, {
    ...ctx,
    embedId: embed.id,
    parentId: embed.id,
    path: [...ctx.path, embed.id],
  });
  return contribution.node;
};

const normalizeChild = (child: VanillaChildSpec, ctx: NormalizeContext): IRChild => {
  if (isEmbed(child)) {
    registerIdentity(child.id, ctx.parentId, [...ctx.path, child.id], ctx);
    return lowerEmbed(child, ctx);
  }

  const identity = readIdentity(child);
  registerIdentity(identity, ctx.parentId, identity === undefined ? ctx.path : [...ctx.path, identity], ctx);
  if (!isScope(child)) return child;

  const scopeId = identity ?? ctx.parentId;
  const scopePath = identity === undefined ? ctx.path : [...ctx.path, identity];
  const scopeCtx: NormalizeContext = { ...ctx, parentId: scopeId, path: scopePath };
  const children = (child.children as Array<VanillaChildSpec>).map(scopeChild => normalizeChild(scopeChild, scopeCtx));
  return { ...child, children };
};

/** 把 Vanilla plain spec 规范化为 core IR + runtime metadata。 */
export const normalizeFigureSpec = (
  figure: VanillaFigureSpec,
  options: VanillaNormalizeOptions = {},
): VanillaNormalizedFigure => {
  if ('children' in figure && 'layers' in figure) {
    throw new Error('vanilla spec figure cannot contain both children and layers.');
  }
  const layers = asLayerStack(figure);
  const contributions: Array<ContributionRecord> = [];
  const identityIndex = new Map<string, Array<string>>();
  const parentIndex = new Map<string, string>();
  const layerMetas: Array<VanillaLayerMeta> = [];
  const children: Array<IRChild> = [];

  for (const [order, layer] of layers.entries()) {
    if (identityIndex.has(layer.id)) {
      throw new Error(`vanilla spec duplicate identity "${layer.id}" at layer "${layer.id}"`);
    }
    identityIndex.set(layer.id, [layer.id]);
    parentIndex.set(layer.id, figure.id ?? 'figure');

    const ctx: NormalizeContext = {
      layerId: layer.id,
      parentId: layer.id,
      path: [layer.id],
      adapters: options.adapters,
      contributions,
      identityIndex,
      parentIndex,
    };
    const layerChildren = layer.children.map(child => normalizeChild(child, ctx));
    children.push(...layerChildren);
    layerMetas.push({
      id: layer.id,
      cache: layer.cache ?? VanillaLayerCache.Auto,
      order,
      zIndex: layer.zIndex ?? 0,
      childIds: layer.children
        .map(child => (isEmbed(child) ? child.id : readIdentity(child)))
        .filter((id): id is string => id !== undefined),
      hasAnonymousChildren: layer.children.some(child => !isEmbed(child) && readIdentity(child) === undefined),
      invalidationBoundary: layer.id,
    });
  }

  const runtimeMeta: VanillaRuntimeMeta = { layers: layerMetas, identityIndex, parentIndex };
  const ir: IRScene = {
    type: 'scene',
    version: 1,
    children,
    ...(figure.viewBox ? { viewBox: figure.viewBox } : {}),
    ...(figure.animations ? { animations: figure.animations } : {}),
  };

  return {
    ir,
    composites: [...aggregateComposites(contributions), ...(options.composites ?? [])],
    runtimeMeta,
  };
};
