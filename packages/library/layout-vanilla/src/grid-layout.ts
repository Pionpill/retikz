import type { GridLayoutItemInput } from '@retikz/layout';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { createGridLayout, GridLayoutProvider } from '@retikz/layout';

import type { InputGridLayout } from './normalize';

import { normalizeLayoutItems } from './normalize';

/** Vanilla Grid 布局嵌入项的稳定类别 */
const GridLayoutEmbedKind = 'layout.gridLayout';

/** Layout Grid 布局的 InputEmbed adapter */
export const GridLayoutInputEmbedAdapter: InputEmbedAdapter<InputGridLayout> = {
  kind: GridLayoutEmbedKind,
  lower: (props, context) => {
    const { children, ...input } = props;
    const normalized = normalizeLayoutItems<GridLayoutItemInput>(children, context);
    return {
      node: createGridLayout({ ...input, children: normalized.items }),
      providerDependencies: {
        roots: [GridLayoutProvider.key, ...normalized.providerDependencies.roots],
        providers: [GridLayoutProvider, ...normalized.providerDependencies.providers],
      },
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建由 Layout 适配器下沉的 Grid 布局嵌入项 */
export const gridLayout = (id: string, input: InputGridLayout, authoring?: unknown): InputEmbed<InputGridLayout> => ({
  type: 'embed',
  kind: GridLayoutEmbedKind,
  id,
  props: input,
  ...(authoring === undefined ? {} : { authoring }),
});
