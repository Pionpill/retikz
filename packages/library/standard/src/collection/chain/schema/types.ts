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
export type IRChainItem = string | (IRCell & { kind: 'cell' }) | IRChainParallel;
/** 完整分支保留递归 drawable 内容与局部覆盖 */
export type IRChainParallel = Omit<input<typeof ChainParallelSchema>, 'branches'> & {
  /** 按交叉轴顺序排列的非空支路 */
  branches: Array<{ items: Array<IRChainItem> }>;
};
export type IRChainConnection = input<typeof ChainConnectionSchema>;
export type IRChainLayout = input<typeof ChainLayoutSchema>;
export type IRChainSkeleton = input<typeof ChainSkeletonSchema>;
/** 三种互斥输入共用 Core 作用域与单元内容契约 */
export type IRChain = Omit<input<typeof ChainSchema>, Exclude<keyof IRScopeProps, 'style'> | 'items'> &
  Omit<IRScopeProps, 'style'> &
  (
    | { items: Array<IRChainItem>; data?: never; skeleton?: never; dataExpand?: never }
    | {
        items?: never;
        data: NonNullable<input<typeof ChainSchema>['data']>;
        skeleton?: never;
        dataExpand?: input<typeof ChainSchema>['dataExpand'];
      }
    | { items?: never; data?: never; skeleton: IRChainSkeleton; dataExpand?: never }
  );
