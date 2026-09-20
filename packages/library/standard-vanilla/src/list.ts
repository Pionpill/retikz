import type { IRList } from '@retikz/standard';
import { createList, ListProvider } from '@retikz/standard';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import type { InputCell } from './cell';
import { normalizeCells } from './cell';
import { StandardListEmbedKind } from './constants';

/** List 的 Vanilla authoring 输入 */
export type InputList = Omit<IRList, 'namespace' | 'type' | 'items'> & { items: Array<string | InputCell> };

/** 将 List 输入与嵌套内容交给根级 traversal */
export const ListInputEmbedAdapter: InputEmbedAdapter<InputList> = {
  kind: StandardListEmbedKind,
  lower: (props, context) => {
    const { items, ...input } = props;
    const normalized = normalizeCells(
      items.map(cell => (typeof cell === 'string' ? { content: cell } : cell)),
      context,
      ListProvider,
    );
    return {
      node: createList({
        namespace: 'standard',
        type: 'list',
        ...input,
        items: normalized.cells.map((cell, index) => (typeof items[index] === 'string' ? items[index] : cell)),
      }),
      providerDependencies: normalized.providerDependencies,
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建 List embed；参数 id 是 authoring 身份，持久化身份使用 input.id */
export const list = (id: string, input: InputList): InputEmbed<InputList> => ({
  type: 'embed',
  kind: StandardListEmbedKind,
  id,
  props: input,
});
