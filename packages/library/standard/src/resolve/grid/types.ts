import type { IRGrid, IRGridLine } from '../../composites/presentation/grid';
import type { GridNumericBounds } from '../../composites/presentation/grid/geometry';

/** Grid 的确定方向配置 */
export type CanonicalGridLine = Omit<IRGridLine, 'spacing' | 'origin' | 'includeBoundary' | 'major'> & {
  spacing: number;
  origin: number;
  includeBoundary: boolean;
  major?: NonNullable<IRGridLine['major']> & { offset: number };
};

/** 已确定边界、线条和边框的 Grid */
export type CanonicalGrid = Omit<IRGrid, 'bounds' | 'line' | 'border'> & {
  bounds: GridNumericBounds;
  line: false | { vertical: CanonicalGridLine; horizontal: CanonicalGridLine };
  border?: NonNullable<IRGrid['border']> &
    Required<Pick<NonNullable<IRGrid['border']>, 'padding' | 'order' | 'extendLines'>>;
};
