import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../_cell/schema';
import type { QueueSchema, QueueBorderSchema, QueueLayoutSchema, QueueSkeletonSchema } from './schema';

export type IRQueueLayout = input<typeof QueueLayoutSchema>;
export type IRQueueBorder = input<typeof QueueBorderSchema>;
export type IRQueueSkeleton = input<typeof QueueSkeletonSchema>;

/** 队首到队尾的稀疏 Source，三种输入互斥 */
export type IRQueue = Omit<
  input<typeof QueueSchema>,
  Exclude<keyof IRScopeProps, 'style'> | 'items' | 'data' | 'skeleton' | 'dataExpand'
> &
  Omit<IRScopeProps, 'style'> &
  (
    | {
        /** 显式单格，最后一项为队尾 */ items: Array<string | IRCell>;
        data?: never;
        skeleton?: never;
        dataExpand?: never;
      }
    | {
        /** JSON 数据，按队首到队尾排列 */ data: NonNullable<input<typeof QueueSchema>['data']>;
        items?: never;
        skeleton?: never;
        /** 嵌套数据展开选择 */ dataExpand?: input<typeof QueueSchema>['dataExpand'];
      }
    | { /** 无真实数据的单格骨架 */ skeleton: IRQueueSkeleton; items?: never; data?: never; dataExpand?: never }
  );
