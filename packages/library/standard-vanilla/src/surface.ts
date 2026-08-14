import type { SurfaceInput } from '@retikz/standard';
import type { InputChild, InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { createSurface, SurfaceProvider } from '@retikz/standard';

import { StandardSurfaceEmbedKind } from './constants';

/** Surface 唯一 child 的作者侧输入 */
export type InputSurfaceChild = InputChild;

/** Surface 输入可显式指定持久化 Scope id，省略时由 embed id 派生 */
export type InputSurface = Omit<SurfaceInput, 'namespace' | 'type' | 'child' | 'id'> & {
  /** 要持久化到 Surface IR 的显式身份 */
  id?: string;
  /** 唯一 child 与其可选 Tier 2 依赖 */
  child: InputSurfaceChild;
};

/** 创建由 Surface adapter 在根 Scene traversal 中归一化的唯一 child 输入 */
export const surfaceChild = (child: InputSurfaceChild): InputSurfaceChild => child;

/** Standard Surface 的 InputEmbed adapter */
export const SurfaceInputEmbedAdapter: InputEmbedAdapter<InputSurface> = {
  kind: StandardSurfaceEmbedKind,
  lower: (props, context) => {
    const { child, id, ...input } = props;
    const normalizeChildren = context.normalizeChildren;
    if (normalizeChildren === undefined)
      throw new Error('Standard Surface inputs require Kernel Vanilla normalizeScene.');
    const normalized = normalizeChildren([child]);
    if (normalized.children.length !== 1) {
      throw new Error('Standard Surface requires exactly one normalized child.');
    }
    return {
      node: createSurface({
        namespace: 'standard',
        type: 'surface',
        ...input,
        id: id ?? `${context.id}/surface`,
        child: normalized.children[0],
      }),
      providerDependencies: {
        roots: [SurfaceProvider.key, ...normalized.providerDependencies.roots],
        providers: [SurfaceProvider, ...normalized.providerDependencies.providers],
      },
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建由 SurfaceInputEmbedAdapter 下沉的 Standard Surface embed */
export const surface = (id: string, input: InputSurface): InputEmbed<InputSurface> => ({
  type: 'embed',
  kind: StandardSurfaceEmbedKind,
  id,
  props: input,
});
