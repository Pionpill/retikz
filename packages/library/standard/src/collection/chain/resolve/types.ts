import type { output } from 'zod';

import type { CanonicalCell } from '../../_cell/resolve';
import type { IRChainConnection } from '../schema';
import type { ChainParallelLayoutSchema } from '../schema';

/** 已物化的结构排布 */
export type CanonicalChainLayout = output<typeof ChainParallelLayoutSchema>;
/** 已解析继承的自动连接 */
export type CanonicalChainConnection = {
  route: NonNullable<IRChainConnection['route']>;
  path: NonNullable<IRChainConnection['path']>;
};
/** 编译消费的单元或并行块 */
export type CanonicalChainItem =
  | { kind: 'cell'; cell: CanonicalCell }
  | {
      kind: 'parallel';
      branches: Array<Array<CanonicalChainItem>>;
      layout: CanonicalChainLayout;
      connection: CanonicalChainConnection;
    };
/** 链的编译消费态 */
export type CanonicalChain = {
  items: Array<CanonicalChainItem>;
  layout: CanonicalChainLayout;
  connection: CanonicalChainConnection;
  direction: 'right' | 'down';
};
