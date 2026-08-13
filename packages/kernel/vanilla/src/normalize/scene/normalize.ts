import type { CompositeDependencyContribution, IRChild, IRScope } from '@retikz/core';

import { CURRENT_IR_VERSION } from '@retikz/core';

import type { AnyInputEmbed, InputEmbedContext } from '../embed';
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

import { normalizeNode } from '../node';
import { normalizePath } from '../path';
import { normalizeScopeWithChildren } from '../scope';
import { createInputRuntimeMetaSnapshot } from './runtime-meta';
import { InputLayerCache } from './types';

/** 隐式 children 简写使用的默认 Layer 身份 */
const DEFAULT_LAYER_ID = 'default';

/** 规范化过程共享的上下文 */
type NormalizeContext = {
  layerId: string;
  parentId: string;
  path: Array<string>;
  adapters: InputNormalizeOptions['adapters'];
  contributions: Array<CompositeDependencyContribution>;
  identityIndex: Map<string, Array<string>>;
  parentIndex: Map<string, string>;
  sourcePath: string;
  authoringSites: Array<InputAuthoringSite>;
};

/** adapter 输出身份校验需要的额外上下文 */
type AdapterOutputContext = NormalizeContext & {
  embedId: string;
};

/** 判断输入是否为 Scene Input */
export const isInputScene = (input: unknown): input is InputScene =>
  typeof input === 'object' && input !== null && (input as { version?: unknown }).version !== 1;

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
  if (ctx.identityIndex.has(id)) {
    throw new Error(`normalizeScene: duplicate identity "${id}" at ${path.join(' > ')}`);
  }
  ctx.identityIndex.set(id, path);
  ctx.parentIndex.set(id, parentId);
};

/** 读取可选 IR identity */
const readIdentity = (child: object): string | undefined =>
  'id' in child && typeof child.id === 'string' ? child.id : undefined;

/** 判断一个 child 是否为 InputEmbed */
const isInputEmbed = (child: InputChild): child is AnyInputEmbed => child.type === 'embed';

/** 判断一个 child 是否为需经 Vanilla 处理的作者侧路径 */
const isInputPath = (child: InputChild): child is InputPath =>
  child.type === 'path' &&
  !('namespace' in child) &&
  ('way' in child || ('children' in child && child.children !== undefined));

/** 判断一个 child 是否为 Core Scope 或 InputScope */
const isInputScope = (child: InputChild): child is InputScope => child.type === 'scope' && !('namespace' in child);

/** 判断一个 child 是否为 Core Node 或 InputNode */
const isInputNode = (child: InputChild): child is InputNode => child.type === undefined || child.type === 'node';

/** 判断 adapter 产物是否为普通 Core Scope */
const isCoreScope = (child: IRChild): child is IRScope => child.type === 'scope' && !('namespace' in child);

/** 当前父容器中一个 child 的 authoring 路径 */
const childSourcePath = (context: NormalizeContext, index: number): string =>
  context.sourcePath.length === 0 ? `children[${index}]` : `${context.sourcePath}.children[${index}]`;

/** 递归确认 adapter 产物不抢占其他公开 identity */
const validateAdapterOutputIdentities = (child: IRChild, ctx: AdapterOutputContext, isRoot = false): void => {
  const identity = readIdentity(child);
  const reusesEmbedIdentity = isRoot && identity === ctx.embedId;
  if (identity !== undefined && !reusesEmbedIdentity) {
    registerIdentity(identity, ctx.parentId, [...ctx.path, identity], ctx);
  }
  if (!isCoreScope(child)) return;
  const parentId = identity ?? ctx.parentId;
  const path = identity === undefined || reusesEmbedIdentity ? ctx.path : [...ctx.path, identity];
  for (const scopeChild of child.children) {
    validateAdapterOutputIdentities(scopeChild, { ...ctx, parentId, path });
  }
};

/** 将一个 InputEmbed 下沉为 Core child 并收集 dependency contribution */
const normalizeEmbed = (input: AnyInputEmbed, ctx: NormalizeContext): IRChild => {
  const adapter = ctx.adapters?.find(entry => entry.kind === input.kind);
  if (adapter === undefined) {
    throw new Error(`normalizeScene: embed "${input.id}" uses kind "${input.kind}" but no adapter was provided`);
  }
  const context: InputEmbedContext = {
    id: input.id,
    kind: input.kind,
    layerId: ctx.layerId,
    identityPath: [...ctx.path, input.id],
  };
  const contribution = adapter.lower(input.props as never, context);
  ctx.contributions.push(contribution.compositeDependencies);
  validateAdapterOutputIdentities(
    contribution.node,
    {
      ...ctx,
      embedId: input.id,
      parentId: input.id,
      path: [...ctx.path, input.id],
    },
    true,
  );
  ctx.authoringSites.push(
    Object.freeze({
      kind: 'embeddable',
      sourcePath: ctx.sourcePath,
      type: input.kind,
      authoring: input.authoring,
    }),
  );
  return contribution.node;
};

/** 归一化一个 authored child，并同步维护 metadata */
const normalizeChild = (input: InputChild, ctx: NormalizeContext): IRChild => {
  if (isInputEmbed(input)) {
    registerIdentity(input.id, ctx.parentId, [...ctx.path, input.id], ctx);
    return normalizeEmbed(input, ctx);
  }

  const identity = readIdentity(input);
  registerIdentity(identity, ctx.parentId, identity === undefined ? ctx.path : [...ctx.path, identity], ctx);
  if (isInputPath(input)) {
    ctx.authoringSites.push(
      Object.freeze({ kind: 'path', sourcePath: `${ctx.sourcePath}.path`, type: 'path', authoring: input.authoring }),
    );
    return normalizePath(input);
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
    const nestedContext: NormalizeContext = {
      ...ctx,
      parentId: scopeParentId,
      path: scopePath,
      sourcePath: `${ctx.sourcePath}.scope`,
    };
    return normalizeScopeWithChildren(input, children =>
      children.map((child, index) =>
        normalizeChild(child, { ...nestedContext, sourcePath: childSourcePath(nestedContext, index) }),
      ),
    );
  }
  if (isInputNode(input)) return normalizeNode(input);
  return input;
};

/** 将 InputScene 一次性归一为唯一 Source IR、contribution 与 runtime metadata */
export const normalizeScene = (scene: InputScene, options: InputNormalizeOptions = {}): NormalizedInputScene => {
  if ('children' in scene && 'layers' in scene) {
    throw new Error('normalizeScene: scene cannot contain both children and layers');
  }
  const layers = asLayerStack(scene);
  const contributions: Array<CompositeDependencyContribution> = [];
  const identityIndex = new Map<string, Array<string>>();
  const parentIndex = new Map<string, string>();
  const layerMetas: Array<InputLayerMeta> = [];
  const children: Array<IRChild> = [];
  const authoringSites: Array<InputAuthoringSite> = [
    Object.freeze({ kind: 'scene', sourcePath: '', type: 'scene', authoring: scene.authoring }),
  ];

  for (const [order, layer] of layers.entries()) {
    if (identityIndex.has(layer.id)) {
      throw new Error(`normalizeScene: duplicate identity "${layer.id}" at layer "${layer.id}"`);
    }
    identityIndex.set(layer.id, [layer.id]);
    parentIndex.set(layer.id, scene.id ?? 'scene');
    const context: NormalizeContext = {
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
