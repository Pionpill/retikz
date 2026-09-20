import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { IRList } from '@retikz/standard';
import type { InputList } from '@retikz/standard-vanilla';
import { ListInputEmbedAdapter } from '@retikz/standard-vanilla';
import type { FC, ReactNode } from 'react';

import type { CellProps } from '../cell';
import { collectCellMarkers, createCellsInput, markerCell } from '../cell';
import type { StandardEmbeddableComponent } from '../shared';
import { ListItem } from './ListItem';

/** List 的 React authoring 属性 */
export type ListProps = Omit<IRList, 'namespace' | 'type' | 'items'> &
  ({ items: Array<string | CellProps>; children?: never } | { items?: never; children?: ReactNode });

/** 保留单元格样式并收集每格的唯一 drawable */
const createListInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { items, children, ...input } = props as ListProps;
  const cells = items ?? collectCellMarkers(children, ListItem, 'List').map(markerCell);
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
