import type { CoreProviderContribution, IRChild, IRScope } from '@retikz/core';

import { CURRENT_IR_VERSION, PathKind } from '@retikz/core';

import type {
  AnyInputEmbed,
  InputEmbedAuthoringSite,
  InputEmbedContext,
  InputEmbedThemeContext,
  NormalizedInputEmbedChildren,
} from '../embed';
import type { InputNode } from '../node';
import type { InputPath } from '../path';
import type { InputScope } from '../scope';
import type {
  InputAuthoringSite,
  InputChild,
  InputLayer,
  InputLayerMeta,
  InputNormalizeOptions,
  InputRuntimeMeta,
  InputScene,
  NormalizedInputScene,
} from './types';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import { normalizeNode } from '../node';
import { normalizePath } from '../path';
import { normalizeScopeWithChildren } from '../scope';
import { createInputRuntimeMetaSnapshot } from './runtime-meta';
import { InputLayerCache } from './types';

/** 隐式 children 简写使用的默认 Layer 身份 */
const DEFAULT_LAYER_ID = 'default';

/** 当前 embed 在所有 slot 中可共用一次的外层 identity */
type ReusedEmbedIdentity = {
  id: string;
  used: boolean;
};

/** 规范化过程共享的上下文 */
type NormalizeContext = {
  layerId: string;
  parentId: string;
  path: Array<string>;
  adapters: InputNormalizeOptions['adapters'];
  embedThemeContext?: InputEmbedThemeContext;
  resolveEmbedScopeTheme?: NonNullable<InputNormalizeOptions['embedThemeContext']>['resolveScope'];
  contributions: Array<CoreProviderContribution>;
  identityIndex: Map<string, Array<string>>;
  parentIndex: Map<string, string>;
  identityFrame: string;
  reusedEmbedIdentity?: ReusedEmbedIdentity;
  sourcePath: string;
  authoringSites: Array<InputAuthoringSite>;
};

/** adapter 输出身份校验需要的额外上下文 */
type AdapterOutputContext = NormalizeContext & {
  embedId: string;
};

/** 判断输入是否为 Scene Input */
export const isInputScene = (input: unknown): input is InputScene =>
  typeof input === 'object' && input !== null && (input as { version?: unknown }).version !== CURRENT_IR_VERSION;

/** 从 children 简写或显式 layers 取得稳定排序的 Layer 栈 */
const asLayerStack = (scene: InputScene): Array<InputLayer> => {
  const layers: Array<InputLayer> =
    'children' in scene
      ? [
          {
            type: 'layer' as const,
            id: DEFAULT_LAYER_ID,
            cache: InputLayerCache.Auto,
            children: scene.children ?? [],
          },
        ]
      : [...scene.layers];
  return layers
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => (left.entry.zIndex ?? 0) - (right.entry.zIndex ?? 0) || left.index - right.index)
    .map(({ entry }) => entry);
};

/** 注册公开 identity，重复值会破坏更新定位 */
const registerIdentity = (
  id: string | undefined,
  parentId: string,
  path: Array<string>,
  ctx: NormalizeContext,
): void => {
  if (id === undefined) return;
  const key = ctx.identityFrame.length === 0 ? id : `${ctx.identityFrame}/${id}`;
  if (ctx.identityIndex.has(key)) {
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      `normalizeScene: duplicate identity "${id}" at ${path.join(' > ')}`,
    );
  }
  ctx.identityIndex.set(key, path);
  ctx.parentIndex.set(key, parentId);
};

/** 进入 localNamespace Scope 后创建与 Core NameStack 对齐的 identity frame */
const nestedIdentityFrame = (ctx: NormalizeContext, identity: string | undefined): string =>
  [ctx.identityFrame, identity ?? ctx.sourcePath].filter(segment => segment.length > 0).join('/');

/** 读取可选 IR identity */
const readIdentity = (child: object): string | undefined =>
  'id' in child && typeof child.id === 'string' ? child.id : undefined;

/** 判断一个 child 是否为 InputEmbed */
const isInputEmbed = (child: InputChild): child is AnyInputEmbed => child.type === 'embed';

/** 读取仅用于作者输入类型分派的 children */
const inputChildrenOf = (child: InputChild): ReadonlyArray<Readonly<{ type?: string }>> | undefined =>
  'children' in child
    ? (child as Readonly<{ children?: ReadonlyArray<Readonly<{ type?: string }>> }>).children
    : undefined;

/** 判断省略 type 的 children 是否含有路径步骤，从而唯一识别为 Path */
const hasInputPathSteps = (child: InputChild): boolean => inputChildrenOf(child)?.[0]?.type === 'step';

/** 判断省略 type 的输入是否有可用于识别 Scope 的非空 children */
const hasInputChildren = (child: InputChild): boolean => (inputChildrenOf(child)?.length ?? 0) > 0;

/** 判断已带 Scope 判别字段的容器是否仍含有需要 Vanilla 归一化的 authoring 子树 */
const hasNestedInput = (child: InputChild): boolean =>
  inputChildrenOf(child)?.some(nested => {
    if (nested.type === undefined || nested.type === 'embed') return true;
    if (
      nested.type === 'path' &&
      ('way' in nested || 'thickness' in nested || 'arrow' in nested || 'arrowDetail' in nested)
    ) {
      return true;
    }
    return nested.type === 'scope' && hasNestedInput(nested as InputChild);
  }) ?? false;

/** 判断一个 child 是否为需经 Vanilla 处理的作者侧路径 */
const isInputPath = (child: InputChild): child is InputPath =>
  !('namespace' in child) &&
  (child.type === undefined
    ? 'way' in child || hasInputPathSteps(child) || 'kind' in child
    : child.type === 'path' && ('way' in child || 'thickness' in child || 'arrow' in child || 'arrowDetail' in child));

/** 判断一个 child 是否为 Core Scope 或 InputScope */
const isInputScope = (child: InputChild): child is InputScope =>
  !('namespace' in child) &&
  (child.type === undefined
    ? 'transforms' in child || (hasInputChildren(child) && !hasInputPathSteps(child))
    : child.type === 'scope' && ('authoring' in child || hasNestedInput(child)));

/** 判断一个 child 是否为 Core Node 或 InputNode */
const isInputNode = (child: InputChild): child is InputNode => child.type === undefined;

/** 判断 adapter 产物是否为普通 Core Scope */
const isCoreScope = (child: IRChild): child is IRScope => child.type === 'scope' && !('namespace' in child);

/** 当前父容器中一个 child 的 authoring 路径 */
const childSourcePath = (context: NormalizeContext, index: number): string =>
  context.sourcePath.length === 0 ? `children[${index}]` : `${context.sourcePath}.children[${index}]`;

/** 递归确认 adapter 产物不抢占其他公开 identity */
const validateAdapterOutputIdentities = (
  child: IRChild,
  ctx: AdapterOutputContext,
  hasReusedEmbedIdentity = false,
): boolean => {
  const identity = readIdentity(child);
  const reusesEmbedIdentity = identity === ctx.embedId && !hasReusedEmbedIdentity;
  if (identity !== undefined && !reusesEmbedIdentity) {
    registerIdentity(identity, ctx.parentId, [...ctx.path, identity], ctx);
  }
  const nextHasReusedEmbedIdentity = hasReusedEmbedIdentity || reusesEmbedIdentity;
  if (!isCoreScope(child)) return nextHasReusedEmbedIdentity;
  const parentId = identity ?? ctx.parentId;
  const path = identity === undefined || reusesEmbedIdentity ? ctx.path : [...ctx.path, identity];
  const nestedContext = child.localNamespace ? { ...ctx, identityFrame: nestedIdentityFrame(ctx, identity) } : ctx;
  let reusedEmbedIdentity = nextHasReusedEmbedIdentity;
  for (const scopeChild of child.children) {
    reusedEmbedIdentity = validateAdapterOutputIdentities(
      scopeChild,
      { ...nestedContext, parentId, path },
      reusedEmbedIdentity,
    );
  }
  return reusedEmbedIdentity;
};

/** 将嵌入 slot 的 Input child 在当前 Scene traversal 中归一化 */
const normalizeEmbeddedChildren = (
  children: ReadonlyArray<InputChild>,
  context: NormalizeContext,
  reusedEmbedIdentity: ReusedEmbedIdentity,
): NormalizedInputEmbedChildren => {
  const contributions: Array<CoreProviderContribution> = [];
  const authoringSites: Array<InputAuthoringSite> = [];
  const nestedContext: NormalizeContext = {
    ...context,
    contributions,
    authoringSites,
    reusedEmbedIdentity,
  };
  const normalizedChildren = children.map((child, index) =>
    normalizeChild(child, {
      ...nestedContext,
      sourcePath: `${context.sourcePath}.children[${index}]`,
    }),
  );
  const sites: Array<InputEmbedAuthoringSite> = [];
  for (const site of authoringSites) {
    if (site.kind === 'scene') continue;
    sites.push(
      Object.freeze({
        kind: site.kind,
        ...(site.owner === undefined ? {} : { owner: site.owner }),
        type: site.type,
        authoring: site.authoring,
      }),
    );
  }
  return Object.freeze({
    children: Object.freeze(normalizedChildren),
    providerDependencies: Object.freeze({
      roots: Object.freeze(contributions.flatMap(contribution => contribution.roots)),
      providers: Object.freeze(contributions.flatMap(contribution => contribution.providers)),
    }),
    authoringSites: Object.freeze(sites),
  });
};

/** 将一个 InputEmbed 下沉为 Core child 并收集 dependency contribution */
const normalizeEmbed = (input: AnyInputEmbed, ctx: NormalizeContext): IRChild => {
  const adapter = ctx.adapters?.find(entry => entry.kind === input.kind);
  if (adapter === undefined) {
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      `normalizeScene: embed "${input.id}" uses kind "${input.kind}" but no adapter was provided`,
    );
  }
  const reusedEmbedIdentity: ReusedEmbedIdentity = { id: input.id, used: false };
  const context: InputEmbedContext = {
    id: input.id,
    kind: input.kind,
    layerId: ctx.layerId,
    identityPath: [...ctx.path, input.id],
    ...(ctx.embedThemeContext === undefined
      ? {}
      : {
          theme: ctx.embedThemeContext.theme,
          ...(ctx.embedThemeContext.themeStyles === undefined
            ? {}
            : { themeStyles: ctx.embedThemeContext.themeStyles }),
        }),
    normalizeChildren: children =>
      normalizeEmbeddedChildren(
        children,
        {
          ...ctx,
          parentId: input.id,
          path: [...ctx.path, input.id],
          sourcePath: `${ctx.sourcePath}.embed`,
        },
        reusedEmbedIdentity,
      ),
  };
  const contribution = adapter.lower(input.props as never, context);
  ctx.contributions.push(contribution.providerDependencies);
  validateAdapterOutputIdentities(contribution.node, {
    ...ctx,
    embedId: input.id,
    parentId: input.id,
    path: [...ctx.path, input.id],
  });
  ctx.authoringSites.push(
    Object.freeze({
      kind: 'embeddable',
      sourcePath: ctx.sourcePath,
      ...('namespace' in contribution.node
        ? {
            owner: {
              kind: 'composite' as const,
              namespace: contribution.node.namespace,
              type: contribution.node.type,
            },
          }
        : {}),
      type: input.kind,
      authoring: input.authoring,
    }),
  );
  contribution.authoringSites?.forEach(site =>
    ctx.authoringSites.push(
      Object.freeze({
        ...site,
        sourcePath: ctx.sourcePath,
      }),
    ),
  );
  return contribution.node;
};

/** 归一化一个 authored child，并同步维护 metadata */
const normalizeChild = (input: InputChild, ctx: NormalizeContext): IRChild => {
  if (isInputEmbed(input)) {
    const reusedEmbedIdentity = ctx.reusedEmbedIdentity;
    if (reusedEmbedIdentity !== undefined && reusedEmbedIdentity.id === input.id && !reusedEmbedIdentity.used) {
      reusedEmbedIdentity.used = true;
    } else {
      registerIdentity(input.id, ctx.parentId, [...ctx.path, input.id], ctx);
    }
    return normalizeEmbed(input, ctx);
  }

  const identity = readIdentity(input);
  const reusedEmbedIdentity = ctx.reusedEmbedIdentity;
  if (
    identity !== undefined &&
    reusedEmbedIdentity !== undefined &&
    reusedEmbedIdentity.id === identity &&
    !reusedEmbedIdentity.used
  ) {
    reusedEmbedIdentity.used = true;
  } else {
    registerIdentity(identity, ctx.parentId, identity === undefined ? ctx.path : [...ctx.path, identity], ctx);
  }
  if (isInputPath(input)) {
    const path = normalizePath(input);
    ctx.authoringSites.push(
      Object.freeze({
        kind: 'path',
        sourcePath: `${ctx.sourcePath}.path`,
        owner: { kind: 'pathKind', name: path.kind ?? PathKind.Stroke },
        type: 'path',
        authoring: input.authoring,
      }),
    );
    return path;
  }
  if (isInputScope(input)) {
    ctx.authoringSites.push(
      Object.freeze({
        kind: 'scope',
        sourcePath: `${ctx.sourcePath}.scope`,
        type: 'scope',
        authoring: input.authoring,
      }),
    );
    const scopeParentId = identity ?? ctx.parentId;
    const scopePath = identity === undefined ? ctx.path : [...ctx.path, identity];
    const scopeThemeContext =
      ctx.embedThemeContext === undefined || ctx.resolveEmbedScopeTheme === undefined
        ? undefined
        : ctx.resolveEmbedScopeTheme(ctx.embedThemeContext, input.theme, `${ctx.sourcePath}.theme`);
    const nestedContext: NormalizeContext = {
      ...ctx,
      parentId: scopeParentId,
      path: scopePath,
      ...(input.localNamespace ? { identityFrame: nestedIdentityFrame(ctx, identity) } : {}),
      sourcePath: `${ctx.sourcePath}.scope`,
      ...(scopeThemeContext === undefined ? {} : { embedThemeContext: scopeThemeContext }),
    };
    return normalizeScopeWithChildren(input, children =>
      children.map((child, index) =>
        normalizeChild(child, { ...nestedContext, sourcePath: childSourcePath(nestedContext, index) }),
      ),
    );
  }
  if (input.type === undefined && 'children' in input) {
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      'normalizeScene: child with an empty children array must declare type',
    );
  }
  if (isInputNode(input)) return normalizeNode(input);
  return input;
};

/** 将 InputScene 一次性归一为唯一 Source IR、contribution 与 runtime metadata */
export const normalizeScene = (scene: InputScene, options: InputNormalizeOptions = {}): NormalizedInputScene => {
  const layers = asLayerStack(scene);
  const contributions: Array<CoreProviderContribution> = [];
  const identityIndex = new Map<string, Array<string>>();
  const parentIndex = new Map<string, string>();
  const layerIds = new Set<string>();
  const layerMetas: Array<InputLayerMeta> = [];
  const children: Array<IRChild> = [];
  const authoringSites: Array<InputAuthoringSite> = [
    Object.freeze({ kind: 'scene', sourcePath: '', type: 'scene', authoring: scene.authoring }),
  ];

  for (const [order, layer] of layers.entries()) {
    if (layerIds.has(layer.id)) {
      throw new RetikzVanillaError(
        RetikzVanillaErrorCode.Normalize,
        `normalizeScene: duplicate identity "${layer.id}" at layer "${layer.id}"`,
      );
    }
    layerIds.add(layer.id);
    const context: NormalizeContext = {
      layerId: layer.id,
      parentId: layer.id,
      path: [layer.id],
      adapters: options.adapters,
      ...(options.embedThemeContext === undefined ? {} : { embedThemeContext: options.embedThemeContext.root }),
      ...(options.embedThemeContext === undefined
        ? {}
        : { resolveEmbedScopeTheme: options.embedThemeContext.resolveScope }),
      contributions,
      identityIndex,
      parentIndex,
      identityFrame: '',
      sourcePath: '',
      authoringSites,
    };
    const sceneOffset = children.length;
    const layerChildren = layer.children.map((child, index) =>
      normalizeChild(child, { ...context, sourcePath: childSourcePath(context, sceneOffset + index) }),
    );
    children.push(...layerChildren);
    layerMetas.push({
      id: layer.id,
      cache: layer.cache ?? InputLayerCache.Auto,
      order,
      zIndex: layer.zIndex ?? 0,
      childIds: layer.children.map(readIdentity).filter((id): id is string => id !== undefined),
      hasAnonymousChildren: layer.children.some(child => readIdentity(child) === undefined),
      invalidationBoundary: layer.id,
    });
  }

  const {
    type: _type,
    version: _version,
    id: _id,
    authoring: _authoring,
    layers: _layers,
    children: _children,
    ...rest
  } = scene;
  void _type;
  void _version;
  void _id;
  void _authoring;
  void _layers;
  void _children;
  const runtimeMeta: InputRuntimeMeta = createInputRuntimeMetaSnapshot({
    layers: layerMetas,
    identityIndex,
    parentIndex,
  });
  return {
    ir: { type: 'scene', version: CURRENT_IR_VERSION, ...rest, children },
    contributions: Object.freeze([...contributions]),
    runtimeMeta,
    authoringSites: Object.freeze(authoringSites),
  };
};
