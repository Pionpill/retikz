import type { CanonicalCell } from '../../_cell/resolve';
import type { IRMap } from '../schema';

/** 默认、行列间距与单元格继承已解析的 Map */
export type CanonicalMap = Omit<IRMap, 'data' | 'entries' | 'layout' | 'dataExpand' | 'skeleton'> & {
  entries: Array<{ key: CanonicalCell; value: CanonicalCell }>;
  layout: Omit<NonNullable<IRMap['layout']>, 'gap'> & { gap: { row: number; column: number } };
};
