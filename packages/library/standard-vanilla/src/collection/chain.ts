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
  path?: NonNullable<IRChainConnection['path']> & Pick<InputPath, 'arrow' | 'arrowDetail' | 'arrowPlacement'>;
};
/** 递归单元支持 Vanilla drawable */
export type InputChainItem =
  | string
  | (InputCell & { kind: 'cell' })
  | (Omit<IRChainParallel, 'branches' | 'connection'> & {
      branches: Array<{ items: Array<InputChainItem> }>;
      connection?: InputChainConnection;
    });
/** 三种输入共用同一结构与连接契约 */
export type InputChain = Omit<
  IRChain,
  'namespace' | 'type' | 'items' | 'data' | 'skeleton' | 'dataExpand' | 'connection'
> & { connection?: InputChainConnection } & (
    | { items: Array<InputChainItem>; data?: never; skeleton?: never; dataExpand?: never }
    | { data: NonNullable<IRChain['data']>; items?: never; skeleton?: never; dataExpand?: IRChain['dataExpand'] }
    | { skeleton: NonNullable<IRChain['skeleton']>; items?: never; data?: never; dataExpand?: never }
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
