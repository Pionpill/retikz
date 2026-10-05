import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { InputArray } from '@retikz/standard-vanilla/collection';
import { ArrayInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { IRArray, IRArrayCell } from '@retikz/standard/collection';
import type { FC, ReactNode } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';
import type { CellProps } from '../cell';
import { collectCellMarkers, createCellsInput, markerCell } from '../cell';
import { ArrayItem } from './ArrayItem';

/**
 * Array 的 React authoring 属性
 * @description data、items、skeleton 与 ArrayItem children 内容入口互斥；全部省略时生成空数组。dataExpand 仅用于 data 入口
 */
export type ArrayProps = Omit<IRArray, 'namespace' | 'type' | 'items' | 'data' | 'dataExpand' | 'skeleton'> &
  (
    | {
        skeleton?: never;
        data: NonNullable<IRArray['data']>;
        items?: never;
        children?: never;
        dataExpand?: IRArray['dataExpand'];
      }
    | {
        skeleton?: never;
        data?: never;
        items: Array<string | CellProps<IRArrayCell['layout']>>;
        children?: never;
        dataExpand?: never;
      }
    | { data?: never; skeleton?: never; items?: never; children?: ReactNode; dataExpand?: never }
    | { skeleton: NonNullable<IRArray['skeleton']>; data?: never; items?: never; children?: never; dataExpand?: never }
  );

/** 保留单元格样式并收集每格的唯一 drawable */
const createArrayInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { data, items, children, skeleton, dataExpand, ...input } = props as ArrayProps;
  if (skeleton !== undefined) return { ...input, skeleton } satisfies InputArray;
  if (data !== undefined)
    return { ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) } satisfies InputArray;
  const cells = items ?? collectCellMarkers(children, ArrayItem, 'Array').map(markerCell<IRArrayCell['layout']>);
  const collected = createCellsInput(
    cells.map(cell => (typeof cell === 'string' ? { content: cell } : cell)),
    context,
  );
  const result: InputArray = {
    ...input,
    items: collected.cells.map((cell, index) => (typeof cells[index] === 'string' ? cells[index] : cell)),
  };
  return withInputEmbedAdapters(result, collected.adapters);
};
const ArrayComponent: FC<ArrayProps> = () => null;
/** Standard Array 呈现组件 */
export const Array = ArrayComponent as StandardEmbeddableComponent<ArrayProps>;
Array.displayName = 'Array';
Array.isTier2Embeddable = true;
Array.inputEmbedAdapter = ArrayInputEmbedAdapter;
Array.createInputEmbedProps = createArrayInput;
