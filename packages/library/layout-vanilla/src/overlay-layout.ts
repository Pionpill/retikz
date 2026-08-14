import type { OverlayLayoutItemInput } from '@retikz/layout';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { createOverlayLayout, OverlayLayoutProvider } from '@retikz/layout';

import type { InputOverlayLayout } from './normalize';

import { normalizeLayoutItems } from './normalize';

/** Vanilla Overlay 布局嵌入项的稳定类别 */
const OverlayLayoutEmbedKind = 'layout.overlayLayout';

/** Layout Overlay 布局的 InputEmbed adapter */
export const OverlayLayoutInputEmbedAdapter: InputEmbedAdapter<InputOverlayLayout> = {
  kind: OverlayLayoutEmbedKind,
  lower: (props, context) => {
    const { children, ...input } = props;
    const normalized = normalizeLayoutItems<OverlayLayoutItemInput>(children, context);
    return {
      node: createOverlayLayout({ ...input, children: normalized.items }),
      compositeDependencies: {
        roots: [OverlayLayoutProvider.key, ...normalized.compositeDependencies.roots],
        providers: [OverlayLayoutProvider, ...normalized.compositeDependencies.providers],
      },
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建由 Layout 适配器下沉的 Overlay 布局嵌入项 */
export const overlayLayout = (
  id: string,
  input: InputOverlayLayout,
  authoring?: unknown,
): InputEmbed<InputOverlayLayout> => ({
  type: 'embed',
  kind: OverlayLayoutEmbedKind,
  id,
  props: input,
  ...(authoring === undefined ? {} : { authoring }),
});
