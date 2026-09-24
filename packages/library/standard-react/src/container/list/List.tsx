import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { InputList } from '@retikz/standard-vanilla/container';
import { ListInputEmbedAdapter } from '@retikz/standard-vanilla/container';
import type { IRList, IRListCell } from '@retikz/standard/container';
import type { FC, ReactNode } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';
import type { CellProps } from '../cell';
import { collectCellMarkers, createCellsInput, markerCell } from '../cell';
import { ListItem } from './ListItem';

/** List 的 React authoring 属性 */
export type ListProps = Omit<IRList, 'namespace' | 'type' | 'items' | 'data' | 'dataObjectDisplay'> &
  (
    | { data: NonNullable<IRList['data']>; items?: never; children?: never; dataObjectDisplay?: IRList['dataObjectDisplay'] }
    | { data?: never; items: Array<string | CellProps<IRListCell['layout']>>; children?: never; dataObjectDisplay?: never }
    | { data?: never; items?: never; children?: ReactNode; dataObjectDisplay?: never }
  );

/** 保留单元格样式并收集每格的唯一 drawable */
const createListInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { data, items, children, dataObjectDisplay, ...input } = props as ListProps;
  if (data !== undefined)
    return { ...input, data, ...(dataObjectDisplay === undefined ? {} : { dataObjectDisplay }) } satisfies InputList;
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
