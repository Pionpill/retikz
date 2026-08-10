import type { AnyCompositeDefinition, IRChild, IRScene, IRScope } from '@retikz/core';

import type { VanillaAuthoringSite } from './authoring-site';
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

import { createVanillaAuthoringSite } from './authoring-site';
import { DEFAULT_LAYER_ID, VanillaLayerCache } from './constants';
import { createRuntimeMetaSnapshot } from './runtime-meta';
import { cloneThemeInput } from './theme-input';

/** 单个嵌入节点贡献的待聚合记录 */
type ContributionRecord = {
  /** 适配器命名空间，用来把同类贡献合并到同一 composite 生成器 */
  namespace: string;
  /** 该嵌入节点带来的外部数据集表 */
  datasets: Record<string, unknown>;
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
  /** 当前父容器在最终 Scene authored tree 中的来源路径 */
  sourcePath: string;
  /** 全图按 authored 顺序收集的领域中立 sites */
  authoringSites: Array<VanillaAuthoringSite>;
};

/** 校验 adapter 输出身份标识时额外需要的上下文 */
type AdapterOutputContext = NormalizeContext & {
  /** 当前 embed id；adapter 根输出可以复用这个公开 identity */
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

/** 读取当前父容器中一个 IR child 的 authored source path */
const childSourcePath = (context: NormalizeContext, index: number): string =>
  context.sourcePath.length === 0 ? `children[${index}]` : `${context.sourcePath}.children[${index}]`;

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

/** 注册 adapter 输出的公开身份标识，根输出与 embed 同 id 时复用已注册 identity */
const registerAdapterOutputIdentity = (
  id: string | undefined,
  ctx: AdapterOutputContext,
  reusesEmbedIdentity: boolean,
): void => {
  if (id === undefined) return;
  if (reusesEmbedIdentity) return;
  registerIdentity(id, ctx.parentId, [...ctx.path, id], ctx);
};

/** 递归检查 adapter 输出树，避免 Tier2 输出抢占外部节点 id */
const validateAdapterOutputIdentities = (child: IRChild, ctx: AdapterOutputContext, isRoot = false): void => {
  const identity = readIdentity(child);
  const reusesEmbedIdentity = isRoot && identity === ctx.embedId;
  registerAdapterOutputIdentity(identity, ctx, reusesEmbedIdentity);
  if (!isIRScope(child)) return;

  const scopeParentId = identity ?? ctx.parentId;
  const scopePath = identity === undefined || reusesEmbedIdentity ? ctx.path : [...ctx.path, identity];
  const childCtx: AdapterOutputContext = { ...ctx, parentId: scopeParentId, path: scopePath };
  for (const scopeChild of child.children) validateAdapterOutputIdentities(scopeChild, childCtx);
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
    makeComposites: contribution.makeComposites,
  });
  validateAdapterOutputIdentities(
    contribution.node,
    {
      ...ctx,
      embedId: embed.id,
      parentId: embed.id,
      path: [...ctx.path, embed.id],
    },
    true,
  );
  return contribution.node;
};

/** 规范化单个子节点，并同步维护身份索引与父子关系索引 */
const normalizeChild = (child: VanillaChildSpec, ctx: NormalizeContext): IRChild => {
  if (isEmbed(child)) {
    registerIdentity(child.id, ctx.parentId, [...ctx.path, child.id], ctx);
    const node = lowerEmbed(child, ctx);
    ctx.authoringSites.push(
      createVanillaAuthoringSite({
        kind: 'embeddable',
        sourcePath: ctx.sourcePath,
        type: child.kind,
        authoring: child.authoring,
      }),
    );
    return node;
  }

  const identity = readIdentity(child);
  registerIdentity(identity, ctx.parentId, identity === undefined ? ctx.path : [...ctx.path, identity], ctx);
  if (isPath(child)) {
    const { authoring, ...path } = child;
    ctx.authoringSites.push(
      createVanillaAuthoringSite({
        kind: 'path',
        sourcePath: `${ctx.sourcePath}.path`,
        type: 'path',
        authoring,
      }),
    );
    return path;
  }
  if (!isScope(child)) return child;

  // scope 的匿名子节点继续归属最近具名祖先；具名 scope 则成为新的父身份标识。
  const scopeId = identity ?? ctx.parentId;
  const scopePath = identity === undefined ? ctx.path : [...ctx.path, identity];
  const scopeSourcePath = `${ctx.sourcePath}.scope`;
  ctx.authoringSites.push(
    createVanillaAuthoringSite({
      kind: 'scope',
      sourcePath: scopeSourcePath,
      type: 'scope',
      authoring: child.authoring,
    }),
  );
  const scopeCtx: NormalizeContext = {
    ...ctx,
    parentId: scopeId,
    path: scopePath,
    sourcePath: scopeSourcePath,
  };
  const children = child.children.map((scopeChild, index) =>
    normalizeChild(scopeChild, {
      ...scopeCtx,
      sourcePath: childSourcePath(scopeCtx, index),
    }),
  );
  const { authoring: _authoring, theme, ...scope } = child;
  void _authoring;
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
  const authoringSites = [
    createVanillaAuthoringSite({
      kind: 'scene',
      sourcePath: '',
      type: 'figure',
      authoring: figure.authoring,
    }),
  ];

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
      sourcePath: '',
      authoringSites,
    };
    const sceneOffset = children.length;
    const layerChildren = layer.children.map((child, index) =>
      normalizeChild(child, {
        ...ctx,
        sourcePath: childSourcePath(ctx, sceneOffset + index),
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
    runtimeMeta,
    authoringSites: Object.freeze(authoringSites),
  };
};
