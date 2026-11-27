import type { CompositeInputBinding, CoreProviderContribution, IRChild, IRScope } from '@retikz/core';
import { RetikzError } from '@retikz/foundation';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type {
  AnyInputEmbed,
  EmbedChildrenNormalizationResult,
  InputEmbedAuthoringSite,
  InputEmbedContext,
  InputEmbedContribution,
  InputPath,
  InputStep,
} from '../element';
import { normalizeNode, normalizePath } from '../element';
import type { SceneNormalizeContext } from './context';
import { childSourcePath, embedSlotSourcePath, inputEmbedIdentityOf, scopeContextOf } from './context';
import type { InputScene, InputAuthoringSite, InputChild } from './types';

/** 只有作者侧 target 简写需要转换，纯 Core 步骤保持原样 */
const hasTargetShorthand = (step: InputStep): boolean =>
  ('to' in step && typeof step.to === 'string') ||
  (step.kind === 'rectangle' && typeof step.from === 'string') ||
  (step.kind === 'arc' && typeof step.center === 'string') ||
  (step.kind === 'smooth' && step.points.some(point => typeof point === 'string'));

/** 判断一个 child 是否为需经 Vanilla 处理的作者侧路径 */
const isInputPath = (child: InputChild): child is InputPath =>
  !('namespace' in child) &&
  child.type === 'path' &&
  ('authoring' in child ||
    'way' in child ||
    typeof child.arrow === 'string' ||
    child.children?.some(hasTargetShorthand) === true);

/** 将嵌入 slot 的 Input child 在当前 Scene traversal 中归一化 */
const normalizeEmbeddedChildren = (
  children: InputScene['children'],
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

    sites.push({
      kind: site.kind,
      type: site.type,
      authoring: site.authoring,
    });
  }

  return {
    children: normalizedChildren,
    ...(runtimeInputs.length === 0 ? {} : { runtimeInputs }),
    providerDependencies: {
      roots: contributions.flatMap(contribution => contribution.roots),
      providers: contributions.flatMap(contribution => contribution.providers),
    },
    authoringSites: sites,
  };
};

/** 将一个 InputEmbed 下沉为 Core child 并收集 dependency contribution */
const normalizeEmbed = (input: AnyInputEmbed, embedId: string, ctx: SceneNormalizeContext): IRChild => {
  const adapter = input.adapter;
  let contribution: InputEmbedContribution;
  try {
    const identityPath = [...ctx.path, embedId];
    let slotIndex = 0;
    const context: InputEmbedContext = {
      id: embedId,
      kind: input.adapter.kind,
      identityPath,
      normalizeChildren: children =>
        normalizeEmbeddedChildren(children, {
          ...ctx,
          path: identityPath,
          sourcePath: embedSlotSourcePath(ctx.sourcePath, slotIndex++),
        }),
    };
    contribution = adapter.lower(input.props as never, context);
  } catch (cause) {
    if (cause instanceof RetikzError) throw cause;
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      `normalizeScene: adapter "${input.adapter.kind}" failed to lower embed "${embedId}" at ${ctx.sourcePath}`,
      { cause },
    );
  }

  for (const binding of contribution.runtimeInputs ?? [])
    ctx.runtimeInputs.push({ path: [...ctx.runtimePath, ...binding.path], input: binding.input });

  ctx.contributions.push(contribution.providerDependencies);

  if (input.authoring !== undefined)
    ctx.authoringSites.push({
      kind: 'embeddable',
      sourcePath: ctx.sourcePath,
      type: input.adapter.kind,
      authoring: input.authoring,
    });

  contribution.authoringSites?.forEach(site =>
    ctx.authoringSites.push({
      ...site,
      sourcePath: ctx.sourcePath,
    }),
  );

  return contribution.node;
};

/** 归一化一个 authored child，并收集作者信息 */
export const normalizeChild = (input: InputChild, ctx: SceneNormalizeContext): IRChild => {
  /** 记录内置子项显式提供的作者来源 */
  const recordAuthoringSite = (kind: 'path' | 'scope' | 'node' | 'coordinate', authoring: unknown): void => {
    if (authoring === undefined) return;
    ctx.authoringSites.push({ kind, type: kind, sourcePath: `${ctx.sourcePath}.${kind}`, authoring });
  };

  /** 带命名空间的复合节点已经是 Core IR，不按内置图元的 type 分派 */
  if ('namespace' in input) return input;

  /** 嵌入项按作者位置确定身份，调用绑定的 adapter 下沉 */
  if (input.type === 'embed') return normalizeEmbed(input, inputEmbedIdentityOf(input, ctx), ctx);

  /** 含作者简写或来源信息的路径需要归一化，纯 IR 路径可直接保留 */
  if (isInputPath(input)) {
    const path = normalizePath(input);
    recordAuthoringSite('path', input.authoring);

    return path;
  }

  /** 单次遍历作用域；仅当子项或作者字段发生转换时重建容器 */
  if (input.type === 'scope') {
    const nestedContext = scopeContextOf(input, ctx);
    if ('authoring' in input) recordAuthoringSite('scope', input.authoring);
    let changed: Array<IRChild> | undefined;
    for (const [index, child] of input.children.entries()) {
      const normalized = normalizeChild(child, {
        ...nestedContext,
        sourcePath: childSourcePath(nestedContext, index),
        runtimePath: [...ctx.runtimePath, 'children', index],
      });
      // 此前的子项均原样返回，已经是 IR
      if (!changed && normalized !== child) changed = input.children.slice(0, index) as Array<IRChild>;
      changed?.push(normalized);
    }
    // 未替换的 children 已逐项归一；只在作用域本身带作者字段时剔除它
    if ('authoring' in input) {
      const { authoring: _authoring, ...scope } = input;
      return changed ? { ...scope, children: changed } : (scope as IRScope);
    }
    return changed ? { ...input, children: changed } : (input as IRScope);
  }

  /** 节点的作者来源单独记录，绘图字段交给节点归一化逻辑 */
  if (input.type === 'node') {
    recordAuthoringSite('node', 'authoring' in input ? input.authoring : undefined);
    return normalizeNode(input);
  }

  /** 坐标无需转换绘图字段，只分离不进入 IR 的作者来源 */
  if (input.type === 'coordinate' && 'authoring' in input) {
    const { authoring, ...coordinate } = input;
    recordAuthoringSite('coordinate', authoring);

    return coordinate;
  }

  return input;
};
