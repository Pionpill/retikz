import type { CompositeInputBinding, CoreProviderContribution, IRChild, IRScope } from '@retikz/core';
import { RetikzError } from '@retikz/foundation';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type {
  AnyInputEmbed,
  EmbedChildrenNormalizationResult,
  InputEmbedAuthoringSite,
  InputEmbedContext,
  InputEmbedContribution,
} from '../element';
import { normalizeNode, normalizePath } from '../element';
import type { ReusedEmbedIdentity, SceneNormalizeContext } from './context';
import {
  childSourcePath,
  embedSlotSourcePath,
  inputEmbedIdentityOf,
  isInputEmbed,
  isInputPath,
  isInputScope,
  nestedIdentityFrame,
  readIdentity,
  scopeContextOf,
} from './context';
import type { InputAuthoringSite, InputChild } from './types';

/** adapter 输出身份校验需要的额外上下文 */
type AdapterOutputContext = SceneNormalizeContext & {
  embedId: string;
};

/** 注册公开 identity，同一命名空间的后定义覆盖此前定位 */
const registerIdentity = (id: string | undefined, parentId: string, ctx: SceneNormalizeContext): void => {
  if (id === undefined) return;

  const key = ctx.identityFrame.length === 0 ? id : `${ctx.identityFrame}/${id}`;
  ctx.identityIndex.set(key, [...ctx.path, id]);
  ctx.parentIndex.set(key, parentId);
};

/** 判断 adapter 产物是否为普通 Core Scope */
const isCoreScope = (child: IRChild): child is IRScope => child.type === 'scope' && !('namespace' in child);

/** 递归确认 adapter 产物不抢占其他公开 identity */
const validateAdapterOutputIdentities = (
  child: IRChild,
  ctx: AdapterOutputContext,
  hasReusedEmbedIdentity = false,
): boolean => {
  const identity = readIdentity(child);
  const reusesEmbedIdentity = identity === ctx.embedId && !hasReusedEmbedIdentity;
  if (identity !== undefined && !reusesEmbedIdentity) {
    registerIdentity(identity, ctx.parentId, ctx);
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
export const normalizeEmbeddedChildren = (
  children: ReadonlyArray<InputChild>,
  context: SceneNormalizeContext,
  reusedEmbedIdentity: ReusedEmbedIdentity,
): EmbedChildrenNormalizationResult => {
  const contributions: Array<CoreProviderContribution> = [];
  const runtimeInputs: Array<CompositeInputBinding> = [];
  const authoringSites: Array<InputAuthoringSite> = [];
  const nestedContext: SceneNormalizeContext = {
    ...context,
    contributions,
    runtimeInputs,
    authoringSites,
    reusedEmbedIdentity,
  };
  const normalizedChildren = children.map((child, index) =>
    normalizeChild(child, {
      ...nestedContext,
      sourcePath: `${context.sourcePath}.children[${index}]`,
      runtimePath: [index],
    }),
  );
  const sites: Array<InputEmbedAuthoringSite> = [];

  for (const site of authoringSites) {
    if (site.kind === 'scene') continue;

    sites.push(
      Object.freeze({
        kind: site.kind,
        type: site.type,
        authoring: site.authoring,
      }),
    );
  }

  return Object.freeze({
    children: Object.freeze(normalizedChildren),
    ...(runtimeInputs.length === 0 ? {} : { runtimeInputs: Object.freeze(runtimeInputs) }),
    providerDependencies: Object.freeze({
      roots: Object.freeze(contributions.flatMap(contribution => contribution.roots)),
      providers: Object.freeze(contributions.flatMap(contribution => contribution.providers)),
    }),
    authoringSites: Object.freeze(sites),
  });
};

/** 将一个 InputEmbed 下沉为 Core child 并收集 dependency contribution */
const normalizeEmbed = (input: AnyInputEmbed, embedId: string, ctx: SceneNormalizeContext): IRChild => {
  const adapter = ctx.adapters?.find(entry => entry.kind === input.kind);
  if (adapter === undefined) {
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      `normalizeScene: embed "${embedId}" uses kind "${input.kind}" but no adapter was provided`,
    );
  }

  const reusedEmbedIdentity: ReusedEmbedIdentity = { id: embedId, used: false };
  let slotIndex = 0;
  const context: InputEmbedContext = {
    id: embedId,
    kind: input.kind,
    layerId: ctx.layerId,
    identityPath: [...ctx.path, embedId],
    ...(ctx.embedThemeContext === undefined
      ? {}
      : {
          theme: ctx.embedThemeContext.theme,
          ...(ctx.embedThemeContext.themeDefinitions === undefined
            ? {}
            : { themeDefinitions: ctx.embedThemeContext.themeDefinitions }),
        }),
    normalizeChildren: children =>
      normalizeEmbeddedChildren(
        children,
        {
          ...ctx,
          parentId: embedId,
          path: [...ctx.path, embedId],
          sourcePath: embedSlotSourcePath(ctx.sourcePath, slotIndex++),
        },
        reusedEmbedIdentity,
      ),
  };
  let contribution: InputEmbedContribution;
  try {
    contribution = adapter.lower(input.props as never, context);
  } catch (cause) {
    if (cause instanceof RetikzError) throw cause;
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      `normalizeScene: adapter "${input.kind}" failed to lower embed "${embedId}" at ${ctx.sourcePath}`,
      { cause },
    );
  }

  for (const binding of contribution.runtimeInputs ?? [])
    ctx.runtimeInputs.push(
      Object.freeze({ path: Object.freeze([...ctx.runtimePath, ...binding.path]), input: binding.input }),
    );

  ctx.contributions.push(contribution.providerDependencies);
  validateAdapterOutputIdentities(contribution.node, {
    ...ctx,
    embedId,
    parentId: embedId,
    path: [...ctx.path, embedId],
  });

  ctx.authoringSites.push(
    Object.freeze({
      kind: 'embeddable',
      sourcePath: ctx.sourcePath,
      ...('namespace' in contribution.node ? {} : {}),
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
export const normalizeChild = (input: InputChild, ctx: SceneNormalizeContext): IRChild => {
  if (isInputEmbed(input)) {
    const embedId = inputEmbedIdentityOf(input, ctx);
    const reusedEmbedIdentity = ctx.reusedEmbedIdentity;
    if (reusedEmbedIdentity !== undefined && reusedEmbedIdentity.id === embedId && !reusedEmbedIdentity.used) {
      reusedEmbedIdentity.used = true;
    } else {
      registerIdentity(embedId, ctx.parentId, ctx);
    }

    return normalizeEmbed(input, embedId, ctx);
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
    registerIdentity(identity, ctx.parentId, ctx);
  }

  if (isInputPath(input)) {
    const path = normalizePath(input);
    ctx.authoringSites.push(
      Object.freeze({
        kind: 'path',
        sourcePath: `${ctx.sourcePath}.path`,
        type: 'path',
        authoring: input.authoring,
      }),
    );

    return path;
  }

  if (isInputScope(input)) {
    const { authoring, children, ...scope } = input;
    ctx.authoringSites.push(
      Object.freeze({
        kind: 'scope',
        sourcePath: `${ctx.sourcePath}.scope`,
        type: 'scope',
        authoring,
      }),
    );
    const nestedContext = scopeContextOf(input, identity, ctx);

    return {
      ...scope,
      children: children.map((child, index) =>
        normalizeChild(child, {
          ...nestedContext,
          sourcePath: childSourcePath(nestedContext, index),
          runtimePath: [...ctx.runtimePath, 'children', index],
        }),
      ),
    };
  }

  if (!('namespace' in input) && input.type === 'node') {
    ctx.authoringSites.push(
      Object.freeze({
        kind: 'node',
        type: 'node',
        sourcePath: `${ctx.sourcePath}.node`,
        authoring: 'authoring' in input ? input.authoring : undefined,
      }),
    );
    return normalizeNode(input);
  }

  if (!('namespace' in input) && input.type === 'coordinate') {
    const { authoring, ...coordinate } = input;
    ctx.authoringSites.push(
      Object.freeze({
        kind: 'coordinate',
        type: 'coordinate',
        sourcePath: `${ctx.sourcePath}.coordinate`,
        authoring,
      }),
    );

    return coordinate;
  }

  return input;
};
