import { PathClipProvider } from '@retikz/extension';
import type { IRArray, IRArrayCell } from '@retikz/standard/collection';
import { createArray, ArrayProvider } from '@retikz/standard/collection';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { StandardArrayEmbedKind } from '../shared/constants';
import type { InputCell } from './cell';
import { dataCellDependencies, normalizeCells } from './cell';

/**
 * Array 的 Vanilla authoring 输入
 * @description items、data 与 skeleton 三选一；dataExpand 仅用于 data 入口。其余字段沿用 IRArray，namespace 与 type 由 adapter 补齐
 */
export type InputArray = Omit<IRArray, 'namespace' | 'type' | 'items' | 'data' | 'dataExpand' | 'skeleton'> &
  (
    | { items: Array<string | InputCell<IRArrayCell>>; data?: never; skeleton?: never; dataExpand?: never }
    | { data: NonNullable<IRArray['data']>; skeleton?: never; items?: never; dataExpand?: IRArray['dataExpand'] }
    | { skeleton: NonNullable<IRArray['skeleton']>; items?: never; data?: never; dataExpand?: never }
  );

/** 将 Array 输入与嵌套内容交给根级 traversal */
export const ArrayInputEmbedAdapter: SynchronousInputEmbedAdapter<InputArray> = {
  kind: StandardArrayEmbedKind,
  lower: (props, context) => {
    if (props.skeleton !== undefined)
      return {
        node: createArray({ namespace: 'standard', type: 'array', ...props }),
        providerDependencies: { roots: [ArrayProvider.key], providers: [ArrayProvider, PathClipProvider] },
      };
    if (props.data !== undefined)
      return {
        node: createArray({ namespace: 'standard', type: 'array', ...props }),
        providerDependencies: dataCellDependencies,
      };
    const { items, ...input } = props;
    const normalized = normalizeCells(
      items.map(cell => (typeof cell === 'string' ? { content: cell } : cell)),
      context,
      ArrayProvider,
    );
    return {
      node: createArray({
        namespace: 'standard',
        type: 'array',
        ...input,
        items: normalized.cells.map((cell, index) => (typeof items[index] === 'string' ? items[index] : cell)),
      }),
      providerDependencies: normalized.providerDependencies,
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/**
 * 创建 Array embed；显式 input.id 同时用作领域与 embed 身份
 * @param input 使用显式单元格、JSON 数组或示意骨架的 Array 输入
 * @returns 持有原始 input 引用的 embed；内容归一与校验在后续 adapter 和编译阶段执行
 */
export const array = (input: InputArray): InputEmbed<InputArray> => ({
  type: 'embed',
  kind: StandardArrayEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
