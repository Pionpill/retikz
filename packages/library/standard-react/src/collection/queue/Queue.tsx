import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { InputQueue } from '@retikz/standard-vanilla/collection';
import { QueueInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { IRQueue, IRCell } from '@retikz/standard/collection';
import type { FC, ReactNode } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';
import type { CellProps } from '../cell';
import { createLinearCellsInput } from '../cell';
import { QueueItem } from './QueueItem';

/**
 * Queue 的 React authoring 属性
 * @description data、items、skeleton 与 QueueItem children 内容入口互斥；全部省略时生成空队列。dataExpand 仅用于 data 入口
 */
export type QueueProps = Omit<IRQueue, 'namespace' | 'type' | 'items' | 'data' | 'dataExpand' | 'skeleton'> &
  (
    | {
        skeleton?: never;
        /** 从数据值展开单元格；与 items、skeleton 和 children 互斥 */
        data: NonNullable<IRQueue['data']>;
        items?: never;
        children?: never;
        /** 仅对 data 入口生效的数据展开策略 */
        dataExpand?: IRQueue['dataExpand'];
      }
    | {
        skeleton?: never;
        data?: never;
        /** 按顺序提供文本或带样式的单元格；与其它内容入口互斥 */
        items: Array<string | CellProps<IRCell['layout']>>;
        children?: never;
        dataExpand?: never;
      }
    | {
        data?: never;
        skeleton?: never;
        items?: never;
        /** 直接使用 QueueItem 声明单元格；不接受其它直属 marker */
        children?: ReactNode;
        dataExpand?: never;
      }
    | {
        /** 只声明空单元格结构；与数据、显式单元格和 JSX 内容互斥 */
        skeleton: NonNullable<IRQueue['skeleton']>;
        data?: never;
        items?: never;
        children?: never;
        dataExpand?: never;
      }
  );

/** 保留单元格样式并收集每格的唯一 drawable */
const createQueueInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { data, items, children, skeleton, dataExpand, ...input } = props as QueueProps;
  if (skeleton !== undefined) return { ...input, skeleton } satisfies InputQueue;
  if (data !== undefined)
    return { ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) } satisfies InputQueue;

  const collected = createLinearCellsInput(items, children, QueueItem, 'Queue', context);
  const result: InputQueue = {
    ...input,
    items: collected.cells,
  };

  return withInputEmbedAdapters(result, collected.adapters);
};

const QueueComponent: FC<QueueProps> = () => null;

/** Standard Queue 呈现组件 */
export const Queue = QueueComponent as StandardEmbeddableComponent<QueueProps>;
Queue.displayName = 'Queue';
Queue.isTier2Embeddable = true;
Queue.inputEmbedAdapter = QueueInputEmbedAdapter;
Queue.createInputEmbedProps = createQueueInput;
