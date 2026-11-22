import type { CompositeInputBinding, CoreProviderContribution } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import type { AnyInputEmbed, InputEmbedContribution, InputScope } from '../element';
import type { InputAuthoringSite } from './types';

/** 规范化过程共享的上下文 */
export type SceneNormalizeContext = {
  runtimePath: PropertyPath;
  runtimeInputs: Array<CompositeInputBinding>;
  layerId: string;
  path: Array<string>;
  prepared?: () => InputEmbedContribution;
  contributions: Array<CoreProviderContribution>;
  sourcePath: string;
  authoringSites: Array<InputAuthoringSite>;
};

/** 读取或为匿名 InputEmbed 确定仅运行时可见的稳定身份 */
export const inputEmbedIdentityOf = (input: AnyInputEmbed, context: SceneNormalizeContext): string =>
  input.id ?? `__retikz-embed:${context.layerId}:${context.sourcePath}:${input.adapter.kind}`;

/** 当前父容器中一个 child 的 authoring 路径 */
export const childSourcePath = (context: SceneNormalizeContext, index: number): string =>
  context.sourcePath.length === 0 ? `children[${index}]` : `${context.sourcePath}.children[${index}]`;

/** 同一嵌入的多个作者 slot 按调用顺序区分；首个 slot 保留正常单槽路径 */
export const embedSlotSourcePath = (sourcePath: string, slotIndex: number): string =>
  slotIndex === 0 ? `${sourcePath}.embed` : `${sourcePath}.embed.slots[${slotIndex}]`;

/** 进入 Scope 时更新身份路径与作者来源路径 */
export const scopeContextOf = (input: InputScope, ctx: SceneNormalizeContext): SceneNormalizeContext => {
  return {
    ...ctx,
    path: input.id === undefined ? ctx.path : [...ctx.path, input.id],
    sourcePath: `${ctx.sourcePath}.scope`,
  };
};
