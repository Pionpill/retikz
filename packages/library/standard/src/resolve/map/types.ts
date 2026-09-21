import type { IRMap } from '../../composites/presentation/map/schemas';
import type { CanonicalCell } from '../cell';
/** 默认、行列间距与单元格继承已解析的 Map */
export type CanonicalMap = Omit<IRMap, 'data' | 'entries' | 'layout'> & {
  entries: Array<{ key: CanonicalCell; value: CanonicalCell }>;
  layout: Omit<NonNullable<IRMap['layout']>, 'gap'> & { gap: { row: number; column: number } };
};
