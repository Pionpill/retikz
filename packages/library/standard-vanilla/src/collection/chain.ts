import { PathClipProvider } from '@retikz/extension';
import type { IRChain, IRChainConnection, IRChainParallel, IRChainItem } from '@retikz/standard/collection';
import { ChainProvider, createChain } from '@retikz/standard/collection';
import type { InputPath, InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';
import { normalizePath } from '@retikz/vanilla';

import { StandardChainEmbedKind } from '../shared/constants';
import { normalizeCells, dataCellDependencies } from './cell';
import type { InputCell } from './cell';

/** 连接输入只增加 Kernel 箭头语法糖 */
export type InputChainConnection = Omit<IRChainConnection, 'path'> & {
  /** 连接线路径配置，额外接受 Vanilla 箭头简写与端点放置参数 */
  path?: NonNullable<IRChainConnection['path']> & Pick<InputPath, 'arrow' | 'arrowDetail' | 'arrowPlacement'>;
};

/** 递归单元支持 Vanilla drawable */
export type InputChainItem =
  | string
  | (InputCell & {
      /** 标识单个链式单元，与并行分支区分 */
      kind: 'cell';
    })
  | (Omit<IRChainParallel, 'branches' | 'connection'> & {
      /** 当前并行部分的有序分支 */
      branches: Array<{
        /** 当前分支中按顺序连接的递归链项 */
        items: Array<InputChainItem>;
      }>;
      /** 当前并行部分的连接线覆盖 */
      connection?: InputChainConnection;
    });

/** 三种输入共用同一结构与连接契约 */
export type InputChain = Omit<
  IRChain,
  'namespace' | 'type' | 'items' | 'data' | 'skeleton' | 'dataExpand' | 'connection'
> & {
  /** 链整体的连接线默认配置 */
  connection?: InputChainConnection;
} & (
    | {
        /** 显式串行项与并行分支，与数据和骨架入口互斥 */
        items: Array<InputChainItem>;
        data?: never;
        skeleton?: never;
        dataExpand?: never;
      }
    | {
        /** 用于展开链项的数据，与其它内容入口互斥 */
        data: NonNullable<IRChain['data']>;
        items?: never;
        skeleton?: never;
        /** 仅用于数据入口的展开策略 */
        dataExpand?: IRChain['dataExpand'];
      }
    | {
        /** 用于构造空链项的结构声明，与其它内容入口互斥 */
        skeleton: NonNullable<IRChain['skeleton']>;
        items?: never;
        data?: never;
        dataExpand?: never;
      }
  );

/** 复用路径归一化，只保留呈现字段和显式空 marks */
const normalizeConnection = (connection: InputChainConnection): IRChainConnection => {
  if (connection.path === undefined) return connection;

  const { type, children, ...path } = normalizePath({
    ...connection.path,
    way: [
      [0, 0],
      [1, 0],
    ],
  });
  void type;
  void children;
  const explicit = connection.path.arrow !== undefined || connection.path.marks !== undefined;

  return { ...connection, path: { ...path, ...(explicit ? { marks: path.marks ?? [] } : {}) } };
};

/** 递归收集内容，通过 Kernel 归一化一次并保留依赖 */
export const ChainInputEmbedAdapter: SynchronousInputEmbedAdapter<InputChain> = {
  kind: StandardChainEmbedKind,
  lower: (props, context) => {
    const { connection, items: sourceItems, data: sourceData, skeleton: sourceSkeleton, dataExpand, ...input } = props;
    void sourceItems;
    void sourceData;
    void sourceSkeleton;
    const common = {
      namespace: 'standard',
      type: 'chain',
      ...input,
      ...(connection === undefined ? {} : { connection: normalizeConnection(connection) }),
    } as const;
    if (props.items === undefined)
      return {
        node: createChain({
          ...common,
          ...(props.data !== undefined
            ? { data: props.data, ...(dataExpand === undefined ? {} : { dataExpand }) }
            : { skeleton: props.skeleton }),
        }),
        providerDependencies: {
          roots: [ChainProvider.key, ...(props.data !== undefined ? dataCellDependencies.roots : [])],
          providers: [
            ChainProvider,
            PathClipProvider,
            ...(props.data !== undefined ? dataCellDependencies.providers : []),
          ],
        },
      };

    const cells: Array<InputCell> = [];

    const collect = (items: Array<InputChainItem>) => {
      for (const item of items) {
        if (typeof item === 'string') cells.push({ content: item });
        else if (item.kind === 'cell') {
          const { kind, ...cell } = item;
          void kind;
          cells.push(cell);
        } else for (const branch of item.branches) collect(branch.items);
      }
    };

    collect(props.items);
    const normalized = normalizeCells(cells, context, ChainProvider);
    let cursor = 0;
    const rebuild = (items: Array<InputChainItem>): Array<IRChainItem> =>
      items.map(item => {
        if (typeof item === 'string') {
          cursor++;
          return item;
        }

        if (item.kind === 'cell') return { kind: 'cell', ...normalized.cells[cursor++] };

        const { connection: blockConnection, ...block } = item;

        return {
          ...block,
          ...(blockConnection === undefined ? {} : { connection: normalizeConnection(blockConnection) }),
          branches: item.branches.map(branch => ({ items: rebuild(branch.items) })),
        };
      });

    return {
      node: createChain({ ...common, items: rebuild(props.items) }),
      providerDependencies: normalized.providerDependencies,
      ...(normalized.authoringSites.length ? { authoringSites: normalized.authoringSites } : {}),
    };
  },
};

/** 创建保留作者输入的链 */
export const chain = (input: InputChain): InputEmbed<InputChain> => ({
  type: 'embed',
  kind: StandardChainEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
