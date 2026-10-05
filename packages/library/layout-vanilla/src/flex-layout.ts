import type { FlexLayoutItemInput } from '@retikz/layout';
import { createFlexLayout, FlexLayoutProvider } from '@retikz/layout';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import type { InputFlexLayout } from './normalize';
import { normalizeLayoutItems, prepareLayoutItems } from './normalize';

/** Vanilla Flex 布局嵌入项的稳定类别 */
const FlexLayoutEmbedKind = 'layout.flexLayout';

/** Layout Flex 布局的 InputEmbed adapter */
export const FlexLayoutInputEmbedAdapter: SynchronousInputEmbedAdapter<InputFlexLayout> &
  Required<Pick<SynchronousInputEmbedAdapter<InputFlexLayout>, 'prepare'>> = {
  kind: FlexLayoutEmbedKind,
  lower: (props, context) => {
    const { children, ...input } = props;
    const normalized = normalizeLayoutItems<FlexLayoutItemInput>(children, context);

    return {
      runtimeInputs: normalized.runtimeInputs,
      node: createFlexLayout({ ...input, children: normalized.items }),
      providerDependencies: {
        roots: [FlexLayoutProvider.key, ...normalized.providerDependencies.roots],
        providers: [FlexLayoutProvider, ...normalized.providerDependencies.providers],
      },
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
  prepare: async (props, context) => {
    const { children, ...input } = props;
    const execute = await prepareLayoutItems<FlexLayoutItemInput>(children, context);

    return {
      execute: async () => {
        const normalized = await execute();
        return {
          node: createFlexLayout({ ...input, children: normalized.items }),
          runtimeInputs: normalized.runtimeInputs,
          providerDependencies: {
            roots: [FlexLayoutProvider.key, ...normalized.providerDependencies.roots],
            providers: [FlexLayoutProvider, ...normalized.providerDependencies.providers],
          },
          ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
        };
      },
    };
  },
};

/** 创建FlexLayout 嵌入项
 * @param input 容器与子项输入，保留传入对象引用
 * @param authoring 交给编译驱动的不透明声明数据；省略时不附加声明
 * @returns 由布局适配器消费的 InputEmbed，不在创建时求解布局
 */
export const flexLayout = (input: InputFlexLayout, authoring?: unknown): InputEmbed<InputFlexLayout> => ({
  type: 'embed',
  kind: FlexLayoutEmbedKind,
  props: input,
  ...(authoring === undefined ? {} : { authoring }),
});
