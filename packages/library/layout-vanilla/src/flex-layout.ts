import type { InputFlexLayoutItemConfig } from '@retikz/layout';
import { createFlexLayout, flexLayoutProvider } from '@retikz/layout';
import { embed } from '@retikz/vanilla';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import type { InputFlexLayout } from './normalize';
import { normalizeLayoutItems } from './normalize';

/** Vanilla Flex 布局嵌入项的稳定类别 */
const flexLayoutEmbedKind = 'layout.flexLayout';

/** Layout Flex 布局的 InputEmbed adapter */
export const flexLayoutInputEmbedAdapter: InputEmbedAdapter<InputFlexLayout> = {
  kind: flexLayoutEmbedKind,
  lower: (props, context) => {
    const { children, ...input } = props;
    const normalized = normalizeLayoutItems<InputFlexLayoutItemConfig>(children, context);

    return {
      runtimeInputs: normalized.runtimeInputs,
      node: createFlexLayout({ ...input, children: normalized.items }),
      providerDependencies: {
        roots: [flexLayoutProvider.key, ...normalized.providerDependencies.roots],
        providers: [flexLayoutProvider, ...normalized.providerDependencies.providers],
      },
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建FlexLayout 嵌入项
 * @param input 容器与子项输入，保留传入对象引用
 * @param authoring 交给编译结果扩展的不透明声明数据；省略时不附加声明
 * @returns 由布局适配器消费的 InputEmbed，不在创建时求解布局
 */
export const flexLayout = (input: InputFlexLayout, authoring?: unknown): InputEmbed<InputFlexLayout> =>
  embed({
    adapter: flexLayoutInputEmbedAdapter,
    props: input,
    ...(authoring === undefined ? {} : { authoring }),
  });
