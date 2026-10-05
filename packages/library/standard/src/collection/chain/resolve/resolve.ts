import { createDataCell, DataExpandSchema } from '../../_cell/data';
import { resolveCell } from '../../_cell/resolve';
import { ChainParallelLayoutSchema, ChainLayoutSchema, ChainConnectionSchema } from '../schema';
import type { IRChain, IRChainItem, IRChainConnection, IRChainSkeleton } from '../schema';
import type { CanonicalChain, CanonicalChainConnection, CanonicalChainItem, CanonicalChainLayout } from './types';

/** 合并稀疏路径配置，marks 显式数组替换 */
const resolveConnection = (
  source: IRChainConnection | undefined,
  parent?: CanonicalChainConnection,
): CanonicalChainConnection => ({
  route: source?.route ?? parent?.route ?? ChainConnectionSchema.shape.route.parse(undefined),
  path: {
    ...parent?.path,
    ...source?.path,
    style: { stroke: 'currentColor', ...parent?.path.style, ...source?.path?.style },
    marks: source?.path?.marks ?? parent?.path.marks ?? [{ pos: 1, mark: { kind: 'arrow' } }],
  },
});
/** 骨架结构只转换符号与显式分支 */
const skeletonItems = (items: NonNullable<IRChainSkeleton['items']>): Array<IRChainItem> =>
  items.map(item =>
    typeof item === 'string'
      ? item === ''
        ? { kind: 'cell' }
        : item
      : { kind: 'parallel', branches: item.branches.map(branchItems => ({ items: skeletonItems(branchItems) })) },
  );
/** 解析三入口及各并行块的字段继承 */
export const resolveChain = (source: IRChain): CanonicalChain => {
  const layout = ChainParallelLayoutSchema.parse(
    source.layout === undefined
      ? {}
      : {
          gap: source.layout.gap,
          branchGap: source.layout.branchGap,
          branchAlign: source.layout.branchAlign,
          spacing: source.layout.spacing,
          justify: source.layout.justify,
        },
  );
  const connection = resolveConnection(source.connection);
  const visit = (
    items: Array<IRChainItem>,
    parentLayout: CanonicalChainLayout,
    parentConnection: CanonicalChainConnection,
  ): Array<CanonicalChainItem> =>
    items.map(item => {
      if (typeof item === 'string' || item.kind === 'cell')
        return { kind: 'cell', cell: resolveCell(item, { overallStyle: source.style, overallLayout: source.layout }) };
      const nestedLayout = ChainParallelLayoutSchema.parse({ ...parentLayout, ...item.layout });
      const nestedConnection = resolveConnection(item.connection, parentConnection);
      return {
        kind: 'parallel',
        layout: nestedLayout,
        connection: nestedConnection,
        branches: item.branches.map(branch => visit(branch.items, nestedLayout, nestedConnection)),
      };
    });
  const skeleton = source.skeleton;
  const items: Array<IRChainItem> =
    skeleton !== undefined
      ? skeleton.items !== undefined
        ? skeletonItems(skeleton.items)
        : skeleton.labels !== undefined
          ? skeletonItems(skeleton.labels)
          : Array.from({ length: skeleton.count }, () => ({ kind: 'cell' }))
      : source.data !== undefined
        ? source.data.map(value => ({
            kind: 'cell',
            ...createDataCell(value, source.dataExpand ?? DataExpandSchema.parse(undefined)),
          }))
        : source.items;
  return {
    items: visit(items, layout, connection),
    layout,
    connection,
    direction: source.layout?.direction ?? ChainLayoutSchema.shape.direction.parse(undefined),
  };
};
