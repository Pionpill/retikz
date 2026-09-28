import type { OverlayLayoutItemInput } from '@retikz/layout';
import { createOverlayLayout, OverlayLayoutProvider } from '@retikz/layout';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

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
      providerDependencies: {
        roots: [OverlayLayoutProvider.key, ...normalized.providerDependencies.roots],
        providers: [OverlayLayoutProvider, ...normalized.providerDependencies.providers],
      },
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建OverlayLayout 嵌入项
 * @param input 容器与子项输入，保留传入对象引用
 * @param authoring 交给编译驱动的不透明声明数据；省略时不附加声明
 * @returns 由布局适配器消费的 InputEmbed，不在创建时求解布局
 */
export const overlayLayout = (input: InputOverlayLayout, authoring?: unknown): InputEmbed<InputOverlayLayout> => ({
  type: 'embed',
  kind: OverlayLayoutEmbedKind,
  props: input,
  ...(authoring === undefined ? {} : { authoring }),
});
