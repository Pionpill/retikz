import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { InputMap } from '@retikz/standard-vanilla/container';
import { MapInputEmbedAdapter } from '@retikz/standard-vanilla/container';
import type { IRMap } from '@retikz/standard/container';
import type { FC, ReactNode } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';
import type { CellProps } from '../cell';
import { createCellsInput } from '../cell';
import { collectMapEntries } from './convert-children';

/** Map 的 React authoring 属性；键值角色覆盖统一位于 style.key/value 与 layout.key/value */
export type MapProps = Omit<IRMap, 'namespace' | 'type' | 'entries' | 'data'> &
  (
    | { data: NonNullable<IRMap['data']>; entries?: never; children?: never }
    | { data?: never; entries: Array<{ key: string | CellProps; value: string | CellProps }>; children?: never }
    | { data?: never; entries?: never; children?: ReactNode }
  );

/** 保留单元格样式并收集每格的唯一 drawable */
const createMapInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { data, entries: dataEntries, children, ...input } = props as MapProps;
  if (data !== undefined) return { ...input, data } satisfies InputMap;
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
