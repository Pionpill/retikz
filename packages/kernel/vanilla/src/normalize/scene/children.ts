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
  isInputEmbed,
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
  if (isInputEmbed(input)) return normalizeEmbed(input, inputEmbedIdentityOf(input, ctx), ctx);

  if (isInputPath(input)) {
    const path = normalizePath(input);
    if (input.authoring !== undefined)
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
    if (authoring !== undefined)
      ctx.authoringSites.push(
        Object.freeze({
          kind: 'scope',
          sourcePath: `${ctx.sourcePath}.scope`,
          type: 'scope',
          authoring,
        }),
      );
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

  if (!('namespace' in input) && input.type === 'node') {
    if ('authoring' in input && input.authoring !== undefined)
      ctx.authoringSites.push(
        Object.freeze({
          kind: 'node',
          type: 'node',
          sourcePath: `${ctx.sourcePath}.node`,
          authoring: input.authoring,
        }),
      );
    return normalizeNode(input);
  }

  if (!('namespace' in input) && input.type === 'coordinate') {
    const { authoring, ...coordinate } = input;
    if (authoring !== undefined)
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
