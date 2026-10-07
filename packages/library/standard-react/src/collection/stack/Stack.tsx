import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { InputStack } from '@retikz/standard-vanilla/collection';
import { StackInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { IRStack, IRCell } from '@retikz/standard/collection';
import type { FC, ReactNode } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';
import type { CellProps } from '../cell';
import { createLinearCellsInput } from '../cell';
import { StackItem } from './StackItem';

/**
 * Stack 的 React authoring 属性
 * @description data、items、skeleton 与 StackItem children 内容入口互斥；全部省略时生成空栈。dataExpand 仅用于 data 入口
 */
export type StackProps = Omit<IRStack, 'namespace' | 'type' | 'items' | 'data' | 'dataExpand' | 'skeleton'> &
  (
    | {
        skeleton?: never;
        /** 从数据值展开单元格；与 items、skeleton 和 children 互斥 */
        data: NonNullable<IRStack['data']>;
        items?: never;
        children?: never;
        /** 仅对 data 入口生效的数据展开策略 */
        dataExpand?: IRStack['dataExpand'];
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
        /** 直接使用 StackItem 声明单元格；不接受其它直属 marker */
        children?: ReactNode;
        dataExpand?: never;
      }
    | {
        /** 只声明空单元格结构；与数据、显式单元格和 JSX 内容互斥 */
        skeleton: NonNullable<IRStack['skeleton']>;
        data?: never;
        items?: never;
        children?: never;
        dataExpand?: never;
      }
  );

/** 保留单元格样式并收集每格的唯一 drawable */
const createStackInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { data, items, children, skeleton, dataExpand, ...input } = props as StackProps;
  if (skeleton !== undefined) return { ...input, skeleton } satisfies InputStack;
  if (data !== undefined)
    return { ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) } satisfies InputStack;

  const collected = createLinearCellsInput(items, children, StackItem, 'Stack', context);
  const result: InputStack = {
    ...input,
    items: collected.cells,
  };

  return withInputEmbedAdapters(result, collected.adapters);
};

const StackComponent: FC<StackProps> = () => null;

/** Standard Stack 呈现组件 */
export const Stack = StackComponent as StandardEmbeddableComponent<StackProps>;
Stack.displayName = 'Stack';
Stack.isTier2Embeddable = true;
Stack.inputEmbedAdapter = StackInputEmbedAdapter;
Stack.createInputEmbedProps = createStackInput;
