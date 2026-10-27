import { pathClipProvider } from '@retikz/extension';
import type { InputSurfaceConfig } from '@retikz/standard/presentation';
import {
  createSurface,
  RetikzStandardError,
  RetikzStandardErrorCode,
  surfaceProvider,
} from '@retikz/standard/presentation';
import type {
  InputChild,
  InputEmbed,
  SynchronousInputEmbedAdapter,
  EmbedChildrenNormalizationResult,
} from '@retikz/vanilla';

import { standardSurfaceEmbedKind } from '../shared/constants';

/** Surface 唯一 child 的作者侧输入 */
export type InputSurfaceChild = InputChild;

/** Surface 输入可显式指定持久化 Scope id */
export type InputSurface = Omit<InputSurfaceConfig, 'namespace' | 'type' | 'child' | 'id'> & {
  /** 要持久化到 Surface IR 的显式身份 */
  id?: string;
  /** 唯一 child 与其可选 Tier 2 依赖 */
  child: InputSurfaceChild;
};

/** 创建由 Surface adapter 在根 Scene traversal 中归一化的唯一 child 输入 */
export const surfaceChild = (child: InputSurfaceChild): InputSurfaceChild => child;

/** Standard Surface 的 InputEmbed adapter */
const createSurfaceContribution = (props: InputSurface, normalized: EmbedChildrenNormalizationResult) => {
  const { child, id, ...input } = props;
  void child;
  if (normalized.children.length !== 1)
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Standard Surface requires exactly one normalized child.',
      details: { childCount: normalized.children.length },
    });

  return {
    node: createSurface({
      namespace: 'standard',
      type: 'surface',
      ...input,
      ...(id === undefined ? {} : { id }),
      child: normalized.children[0],
    }),
    runtimeInputs: normalized.runtimeInputs?.map(binding => ({
      ...binding,
      path: ['child', ...binding.path.slice(1)],
    })),
    providerDependencies: {
      roots: [surfaceProvider.key, ...normalized.providerDependencies.roots],
      providers: [surfaceProvider, pathClipProvider, ...normalized.providerDependencies.providers],
    },
    ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
  };
};

/** Standard Surface 的同步与异步 InputEmbed adapter */
export const surfaceInputEmbedAdapter: SynchronousInputEmbedAdapter<InputSurface> &
  Required<Pick<SynchronousInputEmbedAdapter<InputSurface>, 'prepare'>> = {
  kind: standardSurfaceEmbedKind,
  lower: (props, context) => {
    const { child } = props;
    const normalizeChildren = context.normalizeChildren;
    if (normalizeChildren === undefined) {
      throw new RetikzStandardError({
        code: RetikzStandardErrorCode.AuthoringInvalid,
        message: 'Standard Surface inputs require Kernel Vanilla normalizeScene.',
        details: { operation: 'surfaceInputEmbedAdapter' },
      });
    }

    const normalized = normalizeChildren([child]);

    return createSurfaceContribution(props, normalized);
  },
  prepare: async (props, context) => {
    const child = await context.prepareChildren([props.child]);
    return { execute: async () => createSurfaceContribution(props, await child.execute()) };
  },
};

/** 创建由 surfaceInputEmbedAdapter 下沉的 Standard Surface embed */
export const surface = (input: InputSurface): InputEmbed<InputSurface> => ({
  type: 'embed',
  kind: standardSurfaceEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
