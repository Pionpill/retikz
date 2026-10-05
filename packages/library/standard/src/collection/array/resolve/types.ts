import type { CanonicalCell } from '../../_cell/resolve';
import type { IRArray, IRArrayIndexOptions } from '../schema';

/** 默认与单元格继承已解析的 Array */
export type CanonicalArray = Omit<
  IRArray,
  'data' | 'items' | 'layout' | 'index' | 'cellIdMode' | 'dataExpand' | 'skeleton'
> & {
  items: Array<CanonicalCell>;
  layout: NonNullable<IRArray['layout']> & { direction: 'row' | 'column'; gap: number };
  index:
    | false
    | (Omit<IRArrayIndexOptions, 'start' | 'labels' | 'position'> & { position: 'before' | 'after' } & (
          | { start: number; labels?: never }
          | { labels: Array<string>; start?: never }
        ));
};
