import type { CanonicalCell } from '../../shared/cell/resolve';
import type { IRList } from '../schema';
/** 默认与单元格继承已解析的 List */
export type CanonicalList = Omit<IRList, 'data' | 'items' | 'layout' | 'showIndex' | 'indexStart' | 'cellIdMode'> & {
  items: Array<CanonicalCell>;
  layout: NonNullable<IRList['layout']> & { direction: 'row' | 'column'; gap: number };
  showIndex: boolean;
  indexStart: number;
};
