import type { InputGridLayoutItemConfig } from '@retikz/layout';
import { createGridLayout, gridLayoutProvider } from '@retikz/layout';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import type { InputGridLayout } from './normalize';
import { normalizeLayoutItems, prepareLayoutItems } from './normalize';

/** Vanilla Grid 布局嵌入项的稳定类别 */
const gridLayoutEmbedKind = 'layout.gridLayout';

/** Layout Grid 布局的 InputEmbed adapter */
export const gridLayoutInputEmbedAdapter: SynchronousInputEmbedAdapter<InputGridLayout> &
  Required<Pick<SynchronousInputEmbedAdapter<InputGridLayout>, 'prepare'>> = {
  kind: gridLayoutEmbedKind,
  lower: (props, context) => {
    const { children, ...input } = props;
    const normalized = normalizeLayoutItems<InputGridLayoutItemConfig>(children, context);

    return {
      runtimeInputs: normalized.runtimeInputs,
      node: createGridLayout({ ...input, children: normalized.items }),
      providerDependencies: {
        roots: [gridLayoutProvider.key, ...normalized.providerDependencies.roots],
        providers: [gridLayoutProvider, ...normalized.providerDependencies.providers],
      },
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
  prepare: async (props, context) => {
    const { children, ...input } = props;
    const execute = await prepareLayoutItems<InputGridLayoutItemConfig>(children, context);

    return {
      execute: async () => {
        const normalized = await execute();
        return {
          node: createGridLayout({ ...input, children: normalized.items }),
          runtimeInputs: normalized.runtimeInputs,
          providerDependencies: {
            roots: [gridLayoutProvider.key, ...normalized.providerDependencies.roots],
            providers: [gridLayoutProvider, ...normalized.providerDependencies.providers],
          },
          ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
        };
      },
    };
  },
};

/** 创建GridLayout 嵌入项
 * @param input 容器与子项输入，保留传入对象引用
 * @param authoring 交给编译驱动的不透明声明数据；省略时不附加声明
 * @returns 由布局适配器消费的 InputEmbed，不在创建时求解布局
 */
export const gridLayout = (input: InputGridLayout, authoring?: unknown): InputEmbed<InputGridLayout> => ({
  type: 'embed',
  kind: gridLayoutEmbedKind,
  props: input,
  ...(authoring === undefined ? {} : { authoring }),
});
