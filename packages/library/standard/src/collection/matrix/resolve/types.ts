import type { CanonicalCell } from '../../_cell/resolve';
import type { IRMatrix, IRMatrixAxisIndex } from '../schema';

/** 已补全默认值的单轴索引 */
export type CanonicalMatrixAxisIndex =
  | false
  | (Omit<IRMatrixAxisIndex, 'position' | 'start' | 'labels'> & { position: 'before' | 'after' } & (
        | { start: number; labels?: never }
        | { labels: Array<string>; start?: never }
      ));

/** 已解析的矩形格与独立行列索引 */
export type CanonicalMatrix = Omit<
  IRMatrix,
  'items' | 'data' | 'skeleton' | 'dataExpand' | 'cellIdMode' | 'layout' | 'index'
> & {
  items: Array<Array<CanonicalCell>>;
  layout: NonNullable<IRMatrix['layout']> & { gap: { row: number; column: number } };
  index: { row: CanonicalMatrixAxisIndex; column: CanonicalMatrixAxisIndex };
};
