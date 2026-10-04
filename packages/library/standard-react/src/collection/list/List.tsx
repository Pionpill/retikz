import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { InputList } from '@retikz/standard-vanilla/collection';
import { ListInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { IRList, IRListCell } from '@retikz/standard/collection';
import type { FC, ReactNode } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';
import type { CellProps } from '../cell';
import { collectCellMarkers, createCellsInput, markerCell } from '../cell';
import { ListItem } from './ListItem';

/**
 * List 的 React authoring 属性
 * @description data、items、skeleton 与 ListItem children 内容入口互斥；全部省略时生成空列表。dataExpand 仅用于 data 入口
 */
export type ListProps = Omit<IRList, 'namespace' | 'type' | 'items' | 'data' | 'dataExpand' | 'skeleton'> &
  (
    | {
        skeleton?: never;
        data: NonNullable<IRList['data']>;
        items?: never;
        children?: never;
        dataExpand?: IRList['dataExpand'];
      }
    | {
        skeleton?: never;
        data?: never;
        items: Array<string | CellProps<IRListCell['layout']>>;
        children?: never;
        dataExpand?: never;
      }
    | { data?: never; skeleton?: never; items?: never; children?: ReactNode; dataExpand?: never }
    | { skeleton: NonNullable<IRList['skeleton']>; data?: never; items?: never; children?: never; dataExpand?: never }
  );

/** 保留单元格样式并收集每格的唯一 drawable */
const createListInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { data, items, children, skeleton, dataExpand, ...input } = props as ListProps;
  if (skeleton !== undefined) return { ...input, skeleton } satisfies InputList;
  if (data !== undefined)
    return { ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) } satisfies InputList;
  const cells = items ?? collectCellMarkers(children, ListItem, 'List').map(markerCell<IRListCell['layout']>);
  const collected = createCellsInput(
    cells.map(cell => (typeof cell === 'string' ? { content: cell } : cell)),
    context,
  );
  const result: InputList = {
    ...input,
    items: collected.cells.map((cell, index) => (typeof cells[index] === 'string' ? cells[index] : cell)),
  };
  return withInputEmbedAdapters(result, collected.adapters);
};
const ListComponent: FC<ListProps> = () => null;
/** Standard List 呈现组件 */
export const List = ListComponent as StandardEmbeddableComponent<ListProps>;
List.displayName = 'List';
List.isTier2Embeddable = true;
List.inputEmbedAdapter = ListInputEmbedAdapter;
List.createInputEmbedProps = createListInput;
