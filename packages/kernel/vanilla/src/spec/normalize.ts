import type {
  AnyCompositeDefinition,
  AnyThemeTokenDefinition,
  InspectionAuthoringRoot,
  InspectionAuthoringTree,
  InspectionChildForest,
  InspectOptions,
  IRChild,
  IRScene,
  IRScope,
  SceneInspectionAuthoringPathSegment,
  ScopeInspectionAuthoringPathSegment,
} from '@retikz/core';

import { mergeInspectOptions } from '@retikz/core';

import type {
  AnyVanillaEmbedSpec,
  VanillaChildSpec,
  VanillaFigureSpec,
  VanillaLayerMeta,
  VanillaLayerSpec,
  VanillaNormalizedFigure,
  VanillaNormalizeOptions,
  VanillaPathSpec,
  VanillaScopeSpec,
  VanillaTier2Contribution,
} from './types';

import { DEFAULT_LAYER_ID, VanillaLayerCache } from './constants';
import { createRuntimeMetaSnapshot } from './runtime-meta';
import { cloneThemeInput } from './theme-input';

/** 单个嵌入节点贡献的待聚合记录 */
type ContributionRecord = {
  /** 适配器命名空间，用来把同类贡献合并到同一 composite 生成器 */
  namespace: string;
  /** 该嵌入节点带来的外部数据集表 */
  datasets: Record<string, unknown>;
  /** 该嵌入 owner 贡献的 Theme token definition singleton 列表 */
  themeTokenDefinitions?: ReadonlyArray<AnyThemeTokenDefinition>;
  /** 命名空间级 composite 生成器；同一命名空间必须保持同一个函数引用 */
  makeComposites: (mergedDatasets: Record<string, unknown>) => Array<AnyCompositeDefinition>;
};

/** 规范化递归过程共享的上下文 */
type NormalizeContext = {
  /** 当前所在分层 id */
  layerId: string;
  /** 当前节点的父身份标识；匿名节点继承最近的具名祖先 */
  parentId: string;
  /** 从分层根到当前遍历位置的身份路径 */
  path: Array<string>;
  /** 调用方注入的 Tier2 适配器列表 */
  adapters: VanillaNormalizeOptions['adapters'];
  /** 递归过程中收集到的 Tier2 数据与 composite 贡献 */
  contributions: Array<ContributionRecord>;
  /** 全图公开身份标识索引，用于去重和后续 patch 定位 */
  identityIndex: Map<string, Array<string>>;
  /** 全图父子身份关系索引，用于后续失效边界推导 */
  parentIndex: Map<string, string>;
  /** 当前 child 在最终 Scene authored tree 中的 locator */
  inspectionPath: Array<SceneInspectionAuthoringPathSegment | ScopeInspectionAuthoringPathSegment>;
  /** 最近 Scope 累积的 sparse inspection 策略 */
  inheritedInspection?: InspectOptions;
  /** 全图 runtime-only inspection roots */
  inspectionRoots: Array<InspectionAuthoringRoot>;
};

/** 校验 adapter 输出身份标识时额外需要的上下文 */
type AdapterOutputContext = NormalizeContext & {
  /** 当前 embed id；adapter 输出 id 必须以它作为前缀 */
  embedId: string;
  parentId: string;
  path: Array<string>;
};

/** 判断输入是否为 Vanilla 图形规格 */
export const isVanillaFigureSpec = (input: unknown): input is VanillaFigureSpec =>
  typeof input === 'object' &&
  input !== null &&
  (input as { type?: unknown }).type === 'figure' &&
  (input as { version?: unknown }).version === 1;

const hasChildren = (input: VanillaFigureSpec): input is VanillaFigureSpec & { children: Array<VanillaChildSpec> } =>
  'children' in input;

/** 把 children 简写提升为默认分层，并按 zIndex 稳定排序 */
const asLayerStack = (figure: VanillaFigureSpec): Array<VanillaLayerSpec> => {
  const layers = hasChildren(figure)
    ? [{ type: 'layer' as const, id: DEFAULT_LAYER_ID, cache: VanillaLayerCache.Auto, children: figure.children }]
    : figure.layers;
  return layers
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry.zIndex ?? 0) - (b.entry.zIndex ?? 0) || a.index - b.index)
    .map(({ entry }) => entry);
};

/** 注册公开身份标识；重复 id 会破坏 patch 定位，因此在规范化阶段直接拒绝 */
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

const isEmbed = (child: VanillaChildSpec): child is AnyVanillaEmbedSpec => child.type === 'embed';

const isPath = (child: VanillaChildSpec): child is VanillaPathSpec => child.type === 'path' && !('namespace' in child);

const isScope = (child: VanillaChildSpec | IRChild): child is VanillaScopeSpec =>
  child.type === 'scope' && !('namespace' in child) && Array.isArray((child as { children?: unknown }).children);

const isIRScope = (child: IRChild): child is IRScope =>
  child.type === 'scope' && !('namespace' in child) && Array.isArray((child as { children?: unknown }).children);

const readIdentity = (child: object): string | undefined =>
  'id' in child && typeof child.id === 'string' ? child.id : undefined;

/** 按命名空间合并 Tier2 数据集，再生成 core composite definitions */
const aggregateComposites = (contributions: ReadonlyArray<ContributionRecord>): Array<AnyCompositeDefinition> => {
  const groups = new Map<
    string,
    { merged: Map<string, unknown>; maker: (merged: Record<string, unknown>) => Array<AnyCompositeDefinition> }
  >();
  for (const contribution of contributions) {
    let group = groups.get(contribution.namespace);
    if (!group) {
      group = { merged: new Map(), maker: contribution.makeComposites };
      groups.set(contribution.namespace, group);
    } else if (group.maker !== contribution.makeComposites) {
      throw new Error(`vanilla spec namespace "${contribution.namespace}" received multiple makeComposites functions.`);
    }
    for (const [reference, value] of Object.entries(contribution.datasets)) {
      // 同一 namespace 下同名 reference 必须指向同一对象；否则 composite 生成器无法判断该用哪份数据。
      if (group.merged.has(reference) && group.merged.get(reference) !== value) {
        throw new Error(
          `vanilla spec dataset reference conflict in namespace "${contribution.namespace}" for "${reference}".`,
        );
      }
      group.merged.set(reference, value);
    }
  }
  const out: Array<AnyCompositeDefinition> = [];
  for (const group of groups.values()) out.push(...group.maker(Object.fromEntries(group.merged)));
  return out;
};

/** 按嵌入出现顺序收集 Theme definition，并按对象 identity 去重 */
const aggregateThemeTokenDefinitions = (
  contributions: ReadonlyArray<ContributionRecord>,
): Array<AnyThemeTokenDefinition> => {
  const definitions: Array<AnyThemeTokenDefinition> = [];
  const seen = new Set<AnyThemeTokenDefinition>();
  for (const contribution of contributions) {
    for (const definition of contribution.themeTokenDefinitions ?? []) {
      if (seen.has(definition)) continue;
      seen.add(definition);
      definitions.push(definition);
    }
  }
  return definitions;
};

/** 注册 adapter 输出的公开身份标识，并要求它被当前 embed id 命名空间约束 */
const registerAdapterOutputIdentity = (id: string | undefined, ctx: AdapterOutputContext): void => {
  if (id === undefined) return;
  const requiredPrefix = `${ctx.embedId}/`;
  if (!id.startsWith(requiredPrefix)) {
    throw new Error(`vanilla spec adapter output id "${id}" must start with "${requiredPrefix}".`);
  }
  registerIdentity(id, ctx.parentId, [...ctx.path, id], ctx);
};

/** 递归检查 adapter 输出树，避免 Tier2 输出抢占外部节点 id */
const validateAdapterOutputIdentities = (child: IRChild, ctx: AdapterOutputContext): void => {
  const identity = readIdentity(child);
  registerAdapterOutputIdentity(identity, ctx);
  if (!isIRScope(child)) return;

  const scopeParentId = identity ?? ctx.parentId;
  const scopePath = identity === undefined ? ctx.path : [...ctx.path, identity];
  const childCtx: AdapterOutputContext = { ...ctx, parentId: scopeParentId, path: scopePath };
  for (const scopeChild of child.children) validateAdapterOutputIdentities(scopeChild, childCtx);
};

/** 把 ancestor Scope policy 合入一个 Vanilla authored root tree */
const inheritInspectionTree = (
  tree: InspectionAuthoringTree,
  inherited: InspectOptions | undefined,
): InspectionAuthoringTree => {
  const merged = mergeInspectOptions(inherited, tree.policy?.inherited);
  if (merged === undefined) return tree;
  return Object.freeze({
    ...tree,
    policy: Object.freeze({ ...tree.policy, inherited: merged }),
  });
};

/** 把 embed 的 self policy 写入其唯一相对根 occurrence */
const applyEmbedInspection = (
  forest: InspectionChildForest,
  inspect: AnyVanillaEmbedSpec['inspect'],
): InspectionChildForest => {
  if (inspect === undefined) return forest;
  const rootIndexes = forest
    .map((root, index) => (root.locator.path.length === 0 ? index : -1))
    .filter(index => index >= 0);
  if (rootIndexes.length !== 1) {
    throw new Error('vanilla embed inspection requires exactly one contribution root at the embedded node');
  }
  return Object.freeze(
    forest.map((root, index) =>
      index === rootIndexes[0]
        ? Object.freeze({
            ...root,
            tree: Object.freeze({
              ...root.tree,
              policy: Object.freeze({ ...root.tree.policy, self: inspect }),
            }),
          })
        : root,
    ),
  );
};

/** 把相对 contribution.node 的 forest 提升为最终 Scene roots */
const collectContributionInspectionRoots = (context: NormalizeContext, forest: InspectionChildForest): void => {
  const sceneSegment = context.inspectionPath[0];
  const scopePath = context.inspectionPath.slice(1);
  if (
    sceneSegment.kind !== 'sceneChild' ||
    !scopePath.every((segment): segment is ScopeInspectionAuthoringPathSegment => segment.kind === 'scopeChild')
  ) {
    throw new Error('internal: Vanilla inspection path must start at a Scene child');
  }
  forest.forEach(root => {
    const path: InspectionAuthoringRoot['locator']['path'] = [sceneSegment, ...scopePath, ...root.locator.path];
    context.inspectionRoots.push(
      Object.freeze({
        locator: Object.freeze({ target: root.locator.target, path }),
        tree: inheritInspectionTree(root.tree, context.inheritedInspection),
      }),
    );
  });
};

/** 为当前 authored Path 收集 occurrence-local Inspector sidecar */
const collectPathInspectionRoot = (
  context: NormalizeContext,
  inspect: NonNullable<VanillaPathSpec['inspect']>,
): void => {
  const [sceneSegment, ...scopePath] = context.inspectionPath;
  if (
    sceneSegment.kind !== 'sceneChild' ||
    !scopePath.every((segment): segment is ScopeInspectionAuthoringPathSegment => segment.kind === 'scopeChild')
  ) {
    throw new Error('internal: Vanilla Path inspection path must start at a Scene child');
  }
  const path: InspectionAuthoringRoot['locator']['path'] = [sceneSegment, ...scopePath];
  context.inspectionRoots.push(
    Object.freeze({
      locator: Object.freeze({ target: 'path', path }),
      tree: Object.freeze({
        policy: Object.freeze({
          ...(context.inheritedInspection === undefined ? {} : { inherited: context.inheritedInspection }),
          self: inspect,
        }),
      }),
    }),
  );
};

/** 把 embed 节点交给匹配的 Tier2 adapter 静态下沉为 core IR 子节点 */
const lowerEmbed = (embed: AnyVanillaEmbedSpec, ctx: NormalizeContext): IRChild => {
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
    ...(contribution.themeTokenDefinitions === undefined
      ? {}
      : { themeTokenDefinitions: contribution.themeTokenDefinitions }),
    makeComposites: contribution.makeComposites,
  });
  validateAdapterOutputIdentities(contribution.node, {
    ...ctx,
    embedId: embed.id,
    parentId: embed.id,
    path: [...ctx.path, embed.id],
  });
  let inspectionRoots = contribution.inspectionRoots;
  if (inspectionRoots === undefined && embed.inspect !== undefined) {
    if (!('namespace' in contribution.node)) {
      throw new Error('vanilla embed inspection requires an adapter contribution root');
    }
    inspectionRoots = Object.freeze([
      Object.freeze({ locator: Object.freeze({ target: 'composite', path: [] }), tree: Object.freeze({}) }),
    ]);
  }
  if (inspectionRoots !== undefined) {
    collectContributionInspectionRoots(ctx, applyEmbedInspection(inspectionRoots, embed.inspect));
  }
  return contribution.node;
};

/** 规范化单个子节点，并同步维护身份索引与父子关系索引 */
const normalizeChild = (child: VanillaChildSpec, ctx: NormalizeContext): IRChild => {
  if (isEmbed(child)) {
    registerIdentity(child.id, ctx.parentId, [...ctx.path, child.id], ctx);
    return lowerEmbed(child, ctx);
  }

  const identity = readIdentity(child);
  registerIdentity(identity, ctx.parentId, identity === undefined ? ctx.path : [...ctx.path, identity], ctx);
  if (isPath(child)) {
    const { inspect, ...path } = child;
    if (inspect !== undefined) collectPathInspectionRoot(ctx, inspect);
    return path;
  }
  if (!isScope(child)) {
    if ('namespace' in child && ctx.inheritedInspection !== undefined) {
      collectContributionInspectionRoots(ctx, [{ locator: { target: 'composite', path: [] }, tree: {} }]);
    }
    return child;
  }

  // scope 的匿名子节点继续归属最近具名祖先；具名 scope 则成为新的父身份标识。
  const scopeId = identity ?? ctx.parentId;
  const scopePath = identity === undefined ? ctx.path : [...ctx.path, identity];
  const scopeCtx: NormalizeContext = {
    ...ctx,
    parentId: scopeId,
    path: scopePath,
    inheritedInspection: mergeInspectOptions(ctx.inheritedInspection, child.inspect),
  };
  const children = child.children.map((scopeChild, index) =>
    normalizeChild(scopeChild, {
      ...scopeCtx,
      inspectionPath: [...ctx.inspectionPath, { kind: 'scopeChild', index }],
    }),
  );
  const { inspect: _inspect, theme, ...scope } = child;
  void _inspect;
  return { ...scope, ...(theme === undefined ? {} : { theme: cloneThemeInput(theme) }), children };
};

/** 把 Vanilla 普通规格规范化为核心 IR 与运行时元数据 */
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
  const inspectionRoots: Array<InspectionAuthoringRoot> = [];

  for (const [order, layer] of layers.entries()) {
    // layer 本身也是公开身份标识；后续 layer 级 patch / cache 都依赖它唯一。
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
      inspectionPath: [],
      inspectionRoots,
    };
    const sceneOffset = children.length;
    const layerChildren = layer.children.map((child, index) =>
      normalizeChild(child, {
        ...ctx,
        inspectionPath: [{ kind: 'sceneChild', index: sceneOffset + index }],
      }),
    );
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
      // 当前实现 layer 是最小稳定失效边界；后续可用 identityIndex 缩小到具体 child。
      invalidationBoundary: layer.id,
    });
  }

  const runtimeMeta = createRuntimeMetaSnapshot({ layers: layerMetas, identityIndex, parentIndex });
  const ir: IRScene = {
    type: 'scene',
    version: 1,
    ...(figure.theme === undefined ? {} : { theme: cloneThemeInput(figure.theme) }),
    children,
    ...(figure.viewBox ? { viewBox: figure.viewBox } : {}),
    ...(figure.animations ? { animations: figure.animations } : {}),
  };

  return {
    ir,
    composites: [...aggregateComposites(contributions), ...(options.composites ?? [])],
    themeTokenDefinitions: aggregateThemeTokenDefinitions(contributions),
    runtimeMeta,
    inspectionRoots,
  };
};
