import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { InputMap } from '@retikz/standard-vanilla/collection';
import { MapInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { IRMap } from '@retikz/standard/collection';
import type { FC, ReactNode } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';
import type { CellProps } from '../cell';
import { createCellsInput } from '../cell';
import { collectMapEntries } from './convert-children';

/** Map 的 React authoring 属性；键值角色覆盖统一位于 style.key/value 与 layout.key/value */
export type MapProps = Omit<IRMap, 'namespace' | 'type' | 'entries' | 'data' | 'dataExpand' | 'skeleton'> &
  (
    | {
        skeleton?: never;
        /** 用于展开键值对的数据，与 entries、skeleton 和 children 互斥 */
        data: NonNullable<IRMap['data']>;
        entries?: never;
        children?: never;
        /** 仅对 data 入口生效的数据展开策略 */
        dataExpand?: IRMap['dataExpand'];
      }
    | {
        skeleton?: never;
        data?: never;
        /** 显式键值对序列，各侧接受文本或带样式的单元格 */
        entries: Array<{
          /** 当前条目的键侧文本或单元格 */
          key: string | CellProps;
          /** 当前条目的值侧文本或单元格 */
          value: string | CellProps;
        }>;
        children?: never;
        dataExpand?: never;
      }
    | {
        data?: never;
        skeleton?: never;
        entries?: never;
        /** 由 MapEntry 及其键、值 marker 组成的映射条目 */
        children?: ReactNode;
        dataExpand?: never;
      }
    | {
        /** 用于构造空键值对的结构声明，与其它内容入口互斥 */
        skeleton: NonNullable<IRMap['skeleton']>;
        data?: never;
        entries?: never;
        children?: never;
        dataExpand?: never;
      }
  );

/** 保留单元格样式并收集每格的唯一 drawable */
const createMapInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { data, entries: dataEntries, children, skeleton, dataExpand, ...input } = props as MapProps;
  if (skeleton !== undefined) return { ...input, skeleton } satisfies InputMap;
  if (data !== undefined)
    return { ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) } satisfies InputMap;

  const entries = dataEntries ?? collectMapEntries(children);
  const collected = createCellsInput(
    entries.flatMap(entry =>
      [entry.key, entry.value].map(cell => (typeof cell === 'string' ? { content: cell } : cell)),
    ),
    context,
  );
  const result: InputMap = {
    ...input,
    entries: entries.map((_, index) => ({
      key: typeof entries[index].key === 'string' ? entries[index].key : collected.cells[index * 2],
      value: typeof entries[index].value === 'string' ? entries[index].value : collected.cells[index * 2 + 1],
    })),
  };

  return withInputEmbedAdapters(result, collected.adapters);
};

const MapComponent: FC<MapProps> = () => null;

/** Standard Map 呈现组件 */
export const Map = MapComponent as StandardEmbeddableComponent<MapProps>;
Map.displayName = 'Map';
Map.isTier2Embeddable = true;
Map.inputEmbedAdapter = MapInputEmbedAdapter;
Map.createInputEmbedProps = createMapInput;
