import type { CanonicalCell } from '../../_cell/resolve';
import type { IRList, IRListIndexOptions } from '../schema';

/** 默认与单元格继承已解析的 List */
export type CanonicalList = Omit<
  IRList,
  'data' | 'items' | 'layout' | 'index' | 'cellIdMode' | 'dataExpand' | 'skeleton'
> & {
  items: Array<CanonicalCell>;
  layout: NonNullable<IRList['layout']> & { direction: 'row' | 'column'; gap: number };
  index:
    | false
    | (Omit<IRListIndexOptions, 'start' | 'labels' | 'position'> & { position: 'before' | 'after' } & (
          | { start: number; labels?: never }
          | { labels: Array<string>; start?: never }
        ));
};
