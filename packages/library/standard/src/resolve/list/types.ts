import type { IRList } from '../../composites/presentation/list/schemas';
import type { CanonicalCell } from '../cell';
/** 默认与单元格继承已解析的 List */
export type CanonicalList = Omit<IRList, 'data' | 'items' | 'layout' | 'showIndex' | 'indexStart'> & {
  items: Array<CanonicalCell>;
  layout: NonNullable<IRList['layout']> & { direction: 'row' | 'column'; gap: number };
  showIndex: boolean;
  indexStart: number;
};
