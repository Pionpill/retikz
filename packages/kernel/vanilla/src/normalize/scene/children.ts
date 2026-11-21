import type { CompositeInputBinding, CoreProviderContribution, IRChild } from '@retikz/core';
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
import type { SceneNormalizeContext } from './context';
import {
  childSourcePath,
  embedSlotSourcePath,
  inputEmbedIdentityOf,
  isInputPath,
  isInputScope,
  scopeContextOf,
} from './context';
import type { InputAuthoringSite, InputChild } from './types';

/** 将嵌入 slot 的 Input child 在当前 Scene traversal 中归一化 */
export const normalizeEmbeddedChildren = (
  children: ReadonlyArray<InputChild>,
  context: SceneNormalizeContext,
): EmbedChildrenNormalizationResult => {
  const contributions: Array<CoreProviderContribution> = [];
  const runtimeInputs: Array<CompositeInputBinding> = [];
  const authoringSites: Array<InputAuthoringSite> = [];
  const nestedContext: SceneNormalizeContext = {
    ...context,
    contributions,
    runtimeInputs,
    authoringSites,
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
  const adapter = input.adapter;
  let slotIndex = 0;
  const context: InputEmbedContext = {
    id: embedId,
    kind: input.adapter.kind,
    layerId: ctx.layerId,
    identityPath: [...ctx.path, embedId],
    normalizeChildren: children =>
      normalizeEmbeddedChildren(children, {
        ...ctx,
        path: [...ctx.path, embedId],
        sourcePath: embedSlotSourcePath(ctx.sourcePath, slotIndex++),
      }),
  };
  let contribution: InputEmbedContribution;
  try {
    if (ctx.prepared) contribution = ctx.prepared(input, ctx.sourcePath);
    else {
      if (!adapter.lower)
        throw new RetikzVanillaError(
          RetikzVanillaErrorCode.Normalize,
          `Embed "${embedId}" at ${ctx.sourcePath} has no synchronous lower adapter`,
        );
      contribution = adapter.lower(input.props as never, context);
    }
  } catch (cause) {
    if (cause instanceof RetikzError) throw cause;
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      `normalizeScene: adapter "${input.adapter.kind}" failed to lower embed "${embedId}" at ${ctx.sourcePath}`,
      { cause },
    );
  }

  for (const binding of contribution.runtimeInputs ?? [])
    ctx.runtimeInputs.push(
      Object.freeze({ path: Object.freeze([...ctx.runtimePath, ...binding.path]), input: binding.input }),
    );

  ctx.contributions.push(contribution.providerDependencies);

  if (input.authoring !== undefined)
    ctx.authoringSites.push(
      Object.freeze({
        kind: 'embeddable',
        sourcePath: ctx.sourcePath,
        type: input.adapter.kind,
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

/** 归一化一个 authored child，并收集作者信息 */
export const normalizeChild = (input: InputChild, ctx: SceneNormalizeContext): IRChild => {
  /** 记录内置子项显式提供的作者来源 */
  const recordAuthoringSite = (kind: 'path' | 'scope' | 'node' | 'coordinate', authoring: unknown): void => {
    if (authoring === undefined) return;
    ctx.authoringSites.push(Object.freeze({ kind, type: kind, sourcePath: `${ctx.sourcePath}.${kind}`, authoring }));
  };

  /** 带命名空间的复合节点已经是 Core IR，不按内置图元的 type 分派 */
  if ('namespace' in input) return input;

  /** 嵌入项按作者位置确定身份，消费已准备的贡献或调用绑定的 adapter 下沉 */
  if (input.type === 'embed') return normalizeEmbed(input, inputEmbedIdentityOf(input, ctx), ctx);

  /** 含作者简写或来源信息的路径需要归一化，纯 IR 路径可直接保留 */
  if (isInputPath(input)) {
    const path = normalizePath(input);
    recordAuthoringSite('path', input.authoring);

    return path;
  }

  /** Scope 自身或子树含作者输入时，沿作用域路径递归处理子项 */
  if (isInputScope(input)) {
    const { authoring, children, ...scope } = input;
    recordAuthoringSite('scope', authoring);
    const nestedContext = scopeContextOf(input, ctx);

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

  /** 节点的作者来源单独记录，绘图字段交给节点归一化逻辑 */
  if (input.type === 'node') {
    recordAuthoringSite('node', 'authoring' in input ? input.authoring : undefined);
    return normalizeNode(input);
  }

  /** 坐标无需转换绘图字段，只分离不进入 IR 的作者来源 */
  if (input.type === 'coordinate') {
    const { authoring, ...coordinate } = input;
    recordAuthoringSite('coordinate', authoring);

    return coordinate;
  }

  return input;
};
