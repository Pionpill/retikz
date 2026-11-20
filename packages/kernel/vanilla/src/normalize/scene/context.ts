import type { CompositeInputBinding, CompositeInputPath, CoreProviderContribution } from '@retikz/core';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type { AnyInputEmbed, InputEmbedContribution, InputPath, InputScope, InputStep } from '../element';
import type { InputAuthoringSite, InputChild, InputLayer, InputScene } from './types';
import { BuiltinLayerName } from './types';

/** 规范化过程共享的上下文 */
export type SceneNormalizeContext = {
  runtimePath: CompositeInputPath;
  runtimeInputs: Array<CompositeInputBinding>;
  layerId: string;
  path: Array<string>;
  prepared?: (input: AnyInputEmbed, path: string) => InputEmbedContribution;
  contributions: Array<CoreProviderContribution>;
  sourcePath: string;
  authoringSites: Array<InputAuthoringSite>;
};

/** 从 children 简写或显式 layers 取得稳定排序的 Layer 栈 */
export const layerZIndex = (layer: InputLayer): number =>
  layer.zIndex ?? (layer.name === BuiltinLayerName.Background ? 0 : layer.name === BuiltinLayerName.Overlay ? 100 : 10);

/** 先拒绝重名，再稳定排序，不改变作者输入 */
export const asLayerStack = (scene: InputScene): Array<InputLayer> => {
  if (scene.layers === undefined) return [{ type: 'layer', name: BuiltinLayerName.Main, children: scene.children }];
  const names = new Set<string>();
  for (const { name } of scene.layers) {
    if (names.has(name))
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Normalize, 'Duplicate layer name: ' + name);
    names.add(name);
  }
  return [...scene.layers].sort((left, right) => layerZIndex(left) - layerZIndex(right));
};

/** 判断一个 child 是否为 InputEmbed */
export const isInputEmbed = (child: InputChild): child is AnyInputEmbed => child.type === 'embed';

/** 读取或为匿名 InputEmbed 确定仅运行时可见的稳定身份 */
export const inputEmbedIdentityOf = (input: AnyInputEmbed, context: SceneNormalizeContext): string =>
  input.id ?? `__retikz-embed:${context.layerId}:${context.sourcePath}:${input.adapter.kind}`;

/** 只有作者侧 target 简写需要转换，纯 Core 步骤保持原样 */
const hasTargetShorthand = (step: InputStep): boolean =>
  ('to' in step && typeof step.to === 'string') ||
  (step.kind === 'rectangle' && typeof step.from === 'string') ||
  (step.kind === 'arc' && typeof step.center === 'string') ||
  (step.kind === 'smooth' && step.points.some(point => typeof point === 'string'));

/** 判断一个 child 是否为需经 Vanilla 处理的作者侧路径 */
export const isInputPath = (child: InputChild): child is InputPath =>
  !('namespace' in child) &&
  child.type === 'path' &&
  ('authoring' in child ||
    'way' in child ||
    typeof child.arrow === 'string' ||
    child.children?.some(hasTargetShorthand) === true);

/** 判断已带 Scope 判别字段的容器是否仍含有需要 Vanilla 归一化的 authoring 子树 */
const hasNestedInput = (scope: InputScope): boolean =>
  scope.children.some(
    child =>
      'authoring' in child ||
      child.type === 'embed' ||
      isInputPath(child) ||
      (child.type === 'scope' && !('namespace' in child) && hasNestedInput(child)),
  );

/** 判断一个 child 是否为 Core Scope 或 InputScope */
export const isInputScope = (child: InputChild): child is InputScope =>
  !('namespace' in child) && child.type === 'scope' && ('authoring' in child || hasNestedInput(child));

/** 当前父容器中一个 child 的 authoring 路径 */
export const childSourcePath = (context: SceneNormalizeContext, index: number): string =>
  context.sourcePath.length === 0 ? `children[${index}]` : `${context.sourcePath}.children[${index}]`;

/** 同一嵌入的多个作者 slot 按调用顺序区分；首个 slot 保留正常单槽路径 */
export const embedSlotSourcePath = (sourcePath: string, slotIndex: number): string =>
  slotIndex === 0 ? `${sourcePath}.embed` : `${sourcePath}.embed.slots[${slotIndex}]`;

/** 同步归一化与准备 traversal 共用的 Scope 位置及有效 Theme */
export const scopeContextOf = (input: InputScope, ctx: SceneNormalizeContext): SceneNormalizeContext => {
  return {
    ...ctx,
    path: input.id === undefined ? ctx.path : [...ctx.path, input.id],
    sourcePath: `${ctx.sourcePath}.scope`,
  };
};
