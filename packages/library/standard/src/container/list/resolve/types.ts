import type { CanonicalCell } from '../../shared/cell/resolve';
import type { IRList, IRListIndexOptions } from '../schema';
/** 默认与单元格继承已解析的 List */
export type CanonicalList = Omit<IRList, 'data' | 'items' | 'layout' | 'index' | 'cellIdMode' | 'dataObjectDisplay'> & {
  items: Array<CanonicalCell>;
  layout: NonNullable<IRList['layout']> & { direction: 'row' | 'column'; gap: number };
  index: false | (IRListIndexOptions & { position: 'before' | 'after'; start: number });
};
