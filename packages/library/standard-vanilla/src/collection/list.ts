import { PathClipProvider } from '@retikz/extension';
import type { IRList, IRListCell } from '@retikz/standard/collection';
import { createList, ListProvider } from '@retikz/standard/collection';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { StandardListEmbedKind } from '../shared/constants';
import type { InputCell } from './cell';
import { dataCellDependencies, normalizeCells } from './cell';

/**
 * List 的 Vanilla authoring 输入
 * @description items、data 与 skeleton 三选一；dataExpand 仅用于 data 入口。其余字段沿用 IRList，namespace 与 type 由 adapter 补齐
 */
export type InputList = Omit<IRList, 'namespace' | 'type' | 'items' | 'data' | 'dataExpand' | 'skeleton'> &
  (
    | { items: Array<string | InputCell<IRListCell>>; data?: never; skeleton?: never; dataExpand?: never }
    | { data: NonNullable<IRList['data']>; skeleton?: never; items?: never; dataExpand?: IRList['dataExpand'] }
    | { skeleton: NonNullable<IRList['skeleton']>; items?: never; data?: never; dataExpand?: never }
  );

/** 将 List 输入与嵌套内容交给根级 traversal */
export const ListInputEmbedAdapter: SynchronousInputEmbedAdapter<InputList> = {
  kind: StandardListEmbedKind,
  lower: (props, context) => {
    if (props.skeleton !== undefined)
      return {
        node: createList({ namespace: 'standard', type: 'list', ...props }),
        providerDependencies: { roots: [ListProvider.key], providers: [ListProvider, PathClipProvider] },
      };
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
 * @param input 使用显式单元格、JSON 数组或示意骨架的 List 输入
 * @returns 持有原始 input 引用的 embed；内容归一与校验在后续 adapter 和编译阶段执行
 */
export const list = (input: InputList): InputEmbed<InputList> => ({
  type: 'embed',
  kind: StandardListEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
