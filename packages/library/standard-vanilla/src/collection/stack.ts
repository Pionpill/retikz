import { PathClipProvider } from '@retikz/extension';
import type { IRStack, IRCell } from '@retikz/standard/collection';
import { createStack, StackProvider } from '@retikz/standard/collection';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { StandardStackEmbedKind } from '../shared/constants';
import type { InputCell } from './cell';
import { dataCellDependencies, normalizeCellItems } from './cell';

/**
 * Stack 的 Vanilla authoring 输入
 * @description items、data 与 skeleton 三选一；dataExpand 仅用于 data 入口。其余字段沿用 IRStack，namespace 与 type 由 adapter 补齐
 */
export type InputStack = Omit<IRStack, 'namespace' | 'type' | 'items' | 'data' | 'dataExpand' | 'skeleton'> &
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
        data: NonNullable<IRStack['data']>;
        skeleton?: never;
        items?: never;
        /** 仅用于数据入口的展开策略 */
        dataExpand?: IRStack['dataExpand'];
      }
    | {
        /** 用于构造空单元格的结构声明，与其它内容入口互斥 */
        skeleton: NonNullable<IRStack['skeleton']>;
        items?: never;
        data?: never;
        dataExpand?: never;
      }
  );

/** 将 Stack 输入与嵌套内容交给根级 traversal */
export const StackInputEmbedAdapter: SynchronousInputEmbedAdapter<InputStack> = {
  kind: StandardStackEmbedKind,
  lower: (props, context) => {
    if (props.skeleton !== undefined)
      return {
        node: createStack({ namespace: 'standard', type: 'stack', ...props }),
        providerDependencies: { roots: [StackProvider.key], providers: [StackProvider, PathClipProvider] },
      };

    if (props.data !== undefined)
      return {
        node: createStack({ namespace: 'standard', type: 'stack', ...props }),
        providerDependencies: {
          roots: [StackProvider.key, ...dataCellDependencies.roots],
          providers: [StackProvider, ...dataCellDependencies.providers],
        },
      };

    const { items, ...input } = props;
    const normalized = normalizeCellItems(items, context, StackProvider);

    return {
      node: createStack({
        namespace: 'standard',
        type: 'stack',
        ...input,
        items: normalized.cells,
      }),
      providerDependencies: normalized.providerDependencies,
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/**
 * 创建 Stack embed；显式 input.id 同时用作领域与 embed 身份
 * @param input 使用显式单元格、JSON 数组或示意骨架的 Stack 输入
 * @returns 持有原始 input 引用的 embed；内容归一与校验在后续 adapter 和编译阶段执行
 */
export const stack = (input: InputStack): InputEmbed<InputStack> => ({
  type: 'embed',
  kind: StandardStackEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
