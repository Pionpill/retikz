import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../_cell/schema';
import type { StackSchema, StackBorderSchema, StackLayoutSchema, StackSkeletonSchema } from './schema';

export type IRStackLayout = input<typeof StackLayoutSchema>;
export type IRStackBorder = input<typeof StackBorderSchema>;
export type IRStackSkeleton = input<typeof StackSkeletonSchema>;

/** 栈底到栈顶的稀疏 Source，三种输入互斥 */
export type IRStack = Omit<
  input<typeof StackSchema>,
  Exclude<keyof IRScopeProps, 'style'> | 'items' | 'data' | 'skeleton' | 'dataExpand'
> &
  Omit<IRScopeProps, 'style'> &
  (
    | {
        /** 显式单格，最后一项为栈顶 */ items: Array<string | IRCell>;
        data?: never;
        skeleton?: never;
        dataExpand?: never;
      }
    | {
        /** JSON 数据，按输入顺序堆叠 */ data: NonNullable<input<typeof StackSchema>['data']>;
        items?: never;
        skeleton?: never;
        /** 嵌套数据展开选择 */ dataExpand?: input<typeof StackSchema>['dataExpand'];
      }
    | { /** 无真实数据的单格骨架 */ skeleton: IRStackSkeleton; items?: never; data?: never; dataExpand?: never }
  );
