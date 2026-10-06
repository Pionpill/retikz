import { PathClipProvider } from '@retikz/extension';
import type { IRQueue, IRCell } from '@retikz/standard/collection';
import { createQueue, QueueProvider } from '@retikz/standard/collection';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { StandardQueueEmbedKind } from '../shared/constants';
import type { InputCell } from './cell';
import { dataCellDependencies, normalizeCells } from './cell';

/**
 * Queue 的 Vanilla authoring 输入
 * @description items、data 与 skeleton 三选一；dataExpand 仅用于 data 入口。其余字段沿用 IRQueue，namespace 与 type 由 adapter 补齐
 */
export type InputQueue = Omit<IRQueue, 'namespace' | 'type' | 'items' | 'data' | 'dataExpand' | 'skeleton'> &
  (
    | {
        /** 按顺序提供的文本或单元格，与数据和骨架入口互斥 */
        items: Array<string | InputCell<IRCell>>;
        data?: never;
        skeleton?: never;
        dataExpand?: never;
      }
    | {
        /** 用于展开单元格的数据，与显式单元格和骨架入口互斥 */
        data: NonNullable<IRQueue['data']>;
        skeleton?: never;
        items?: never;
        /** 仅用于数据入口的展开策略 */
        dataExpand?: IRQueue['dataExpand'];
      }
    | {
        /** 用于构造空单元格的结构声明，与其它内容入口互斥 */
        skeleton: NonNullable<IRQueue['skeleton']>;
        items?: never;
        data?: never;
        dataExpand?: never;
      }
  );

/** 将 Queue 输入与嵌套内容交给根级 traversal */
export const QueueInputEmbedAdapter: SynchronousInputEmbedAdapter<InputQueue> = {
  kind: StandardQueueEmbedKind,
  lower: (props, context) => {
    if (props.skeleton !== undefined)
      return {
        node: createQueue({ namespace: 'standard', type: 'queue', ...props }),
        providerDependencies: { roots: [QueueProvider.key], providers: [QueueProvider, PathClipProvider] },
      };

    if (props.data !== undefined)
      return {
        node: createQueue({ namespace: 'standard', type: 'queue', ...props }),
        providerDependencies: {
          roots: [QueueProvider.key, ...dataCellDependencies.roots],
          providers: [QueueProvider, ...dataCellDependencies.providers],
        },
      };

    const { items, ...input } = props;
    const normalized = normalizeCells(
      items.map(cell => (typeof cell === 'string' ? { content: cell } : cell)),
      context,
      QueueProvider,
    );

    return {
      node: createQueue({
        namespace: 'standard',
        type: 'queue',
        ...input,
        items: normalized.cells.map((cell, index) => (typeof items[index] === 'string' ? items[index] : cell)),
      }),
      providerDependencies: normalized.providerDependencies,
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/**
 * 创建 Queue embed；显式 input.id 同时用作领域与 embed 身份
 * @param input 使用显式单元格、JSON 数组或示意骨架的 Queue 输入
 * @returns 持有原始 input 引用的 embed；内容归一与校验在后续 adapter 和编译阶段执行
 */
export const queue = (input: InputQueue): InputEmbed<InputQueue> => ({
  type: 'embed',
  kind: StandardQueueEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
