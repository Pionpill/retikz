import type { IRList, IRListCell } from '@retikz/standard/collection';
import { createList, ListProvider } from '@retikz/standard/collection';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { StandardListEmbedKind } from '../shared/constants';
import type { InputCell } from './cell';
import { dataCellDependencies, normalizeCells } from './cell';

/**
 * List 的 Vanilla authoring 输入
 * @description items 与 data 二选一；dataObjectDisplay 仅用于 data 入口。其余字段沿用 IRList，namespace 与 type 由 adapter 补齐
 */
export type InputList = Omit<IRList, 'namespace' | 'type' | 'items' | 'data' | 'dataObjectDisplay'> &
  (
    | { items: Array<string | InputCell<IRListCell>>; data?: never; dataObjectDisplay?: never }
    | { data: NonNullable<IRList['data']>; items?: never; dataObjectDisplay?: IRList['dataObjectDisplay'] }
  );

/** 将 List 输入与嵌套内容交给根级 traversal */
export const ListInputEmbedAdapter: SynchronousInputEmbedAdapter<InputList> = {
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

/**
 * 创建 List embed；显式 input.id 同时用作领域与 embed 身份
 * @param input 使用显式单元格或 JSON 数组的 List 输入
 * @returns 持有原始 input 引用的 embed；内容归一与校验在后续 adapter 和编译阶段执行
 */
export const list = (input: InputList): InputEmbed<InputList> => ({
  type: 'embed',
  kind: StandardListEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
