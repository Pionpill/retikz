import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../_cell/schema';
import type {
  ChainSchema,
  ChainParallelSchema,
  ChainConnectionSchema,
  ChainLayoutSchema,
  ChainSkeletonSchema,
} from './schema';

/** 递归结构复用精确 drawable 类型 */
export type IRChainItem =
  | string
  | (IRCell & {
      /** 标识单个链式单元，与并行分支区分 */
      kind: 'cell';
    })
  | IRChainParallel;

/** 完整分支保留递归 drawable 内容与局部覆盖 */
export type IRChainParallel = Omit<input<typeof ChainParallelSchema>, 'branches'> & {
  /** 按交叉轴顺序排列的非空支路 */
  branches: Array<{
    /** 当前并行分支中按顺序连接的递归链项 */
    items: Array<IRChainItem>;
  }>;
};

export type IRChainConnection = input<typeof ChainConnectionSchema>;

export type IRChainLayout = input<typeof ChainLayoutSchema>;

export type IRChainSkeleton = input<typeof ChainSkeletonSchema>;

/** 三种互斥输入共用 Core 作用域与单元内容契约 */
export type IRChain = Omit<input<typeof ChainSchema>, Exclude<keyof IRScopeProps, 'style'> | 'items'> &
  Omit<IRScopeProps, 'style'> &
  (
    | {
        /** 显式链项序列，与数据和骨架入口互斥 */
        items: Array<IRChainItem>;
        data?: never;
        skeleton?: never;
        dataExpand?: never;
      }
    | {
        items?: never;
        /** 用于展开链项的数据，与显式链项和骨架入口互斥 */
        data: NonNullable<input<typeof ChainSchema>['data']>;
        skeleton?: never;
        /** 只对数据入口生效的展开策略 */
        dataExpand?: input<typeof ChainSchema>['dataExpand'];
      }
    | {
        items?: never;
        data?: never;
        /** 不含数据内容的链结构，与其它内容入口互斥 */
        skeleton: IRChainSkeleton;
        dataExpand?: never;
      }
  );
