import type { output } from 'zod';

import type { CanonicalCell } from '../../_cell/resolve';
import type { IRChainConnection } from '../schema';
import type { ChainParallelLayoutSchema } from '../schema';

/** 已物化的结构排布 */
export type CanonicalChainLayout = output<typeof ChainParallelLayoutSchema>;

/** 已解析继承的自动连接 */
export type CanonicalChainConnection = {
  /** 已补齐的连线路由策略 */
  route: NonNullable<IRChainConnection['route']>;
  /** 继承并补齐后的连线路径配置 */
  path: NonNullable<IRChainConnection['path']>;
};

/** 编译消费的单元或并行块 */
export type CanonicalChainItem =
  | {
      /** 区分已解析的单个单元与并行分支组 */
      kind: 'cell';

      /** 完成当前分支环境继承的单格内容 */
      cell: CanonicalCell;
    }
  | {
      /** 区分已解析的单个单元与并行分支组 */
      kind: 'parallel';
      /** 按作者顺序排列的分支，每条分支仍保持自己的串行步骤 */
      branches: Array<Array<CanonicalChainItem>>;
      /** 此并行块继承并覆盖后的布局配置 */
      layout: CanonicalChainLayout;
      /** 此并行块继承并覆盖后的连接配置 */
      connection: CanonicalChainConnection;
    };

/** 链的编译消费态 */
export type CanonicalChain = {
  /** 保留串并联层次的已解析步骤 */
  items: Array<CanonicalChainItem>;
  /** 根序列使用的完整布局配置 */
  layout: CanonicalChainLayout;
  /** 根序列使用的完整连线配置 */
  connection: CanonicalChainConnection;
  /** 将主轴布局投影为向右或向下排列的最终方向 */
  direction: 'right' | 'down';
};
