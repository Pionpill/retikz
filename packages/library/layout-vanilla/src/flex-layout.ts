import type { FlexLayoutItemInput } from '@retikz/layout';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { createFlexLayout, FlexLayoutProvider } from '@retikz/layout';

import type { InputFlexLayout } from './normalize';

import { normalizeLayoutItems } from './normalize';

/** Vanilla Flex 布局嵌入项的稳定类别 */
const FlexLayoutEmbedKind = 'layout.flexLayout';

/** Layout Flex 布局的 InputEmbed adapter */
export const FlexLayoutInputEmbedAdapter: InputEmbedAdapter<InputFlexLayout> = {
  kind: FlexLayoutEmbedKind,
  lower: (props, context) => {
    const { children, ...input } = props;
    const normalized = normalizeLayoutItems<FlexLayoutItemInput>(children, context);
    return {
      node: createFlexLayout({ ...input, children: normalized.items }),
      compositeDependencies: {
        roots: [FlexLayoutProvider.key, ...normalized.compositeDependencies.roots],
        providers: [FlexLayoutProvider, ...normalized.compositeDependencies.providers],
      },
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建由 Layout 适配器下沉的 Flex 布局嵌入项 */
export const flexLayout = (id: string, input: InputFlexLayout, authoring?: unknown): InputEmbed<InputFlexLayout> => ({
  type: 'embed',
  kind: FlexLayoutEmbedKind,
  id,
  props: input,
  ...(authoring === undefined ? {} : { authoring }),
});
