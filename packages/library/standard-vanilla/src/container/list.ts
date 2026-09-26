import type { IRList, IRListCell } from '@retikz/standard/container';
import { createList, ListProvider } from '@retikz/standard/container';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { StandardListEmbedKind } from '../shared/constants';
import type { InputCell } from './cell';
import { dataCellDependencies, normalizeCells } from './cell';

/** List 的 Vanilla authoring 输入 */
export type InputList = Omit<IRList, 'namespace' | 'type' | 'items' | 'data' | 'dataObjectDisplay'> &
  (
    | { items: Array<string | InputCell<IRListCell>>; data?: never; dataObjectDisplay?: never }
    | { data: NonNullable<IRList['data']>; items?: never; dataObjectDisplay?: IRList['dataObjectDisplay'] }
  );

/** 将 List 输入与嵌套内容交给根级 traversal */
export const ListInputEmbedAdapter: InputEmbedAdapter<InputList> = {
  kind: StandardListEmbedKind,
  lower: (props, context) => {
    if (props.data !== undefined)
      return {
        node: createList({ namespace: 'standard', type: 'list', ...props }),
        providerDependencies: dataCellDependencies,
      };
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

/** 创建 List embed；显式 input.id 同时用作领域与 embed 身份 */
export const list = (input: InputList): InputEmbed<InputList> => ({
  type: 'embed',
  kind: StandardListEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
