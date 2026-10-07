import type { CanonicalCell } from '../../_cell/resolve';
import type { CanonicalCollectionIndex } from '../../_index/resolve';
import type { IRMatrix } from '../schema';

/** 已解析的矩形格与独立行列索引 */
export type CanonicalMatrix = Omit<
  IRMatrix,
  'items' | 'data' | 'skeleton' | 'dataExpand' | 'cellIdMode' | 'layout' | 'index'
> & {
  /** 保持原行列顺序、已完成继承的二维格子 */
  items: Array<Array<CanonicalCell>>;
  /** 已将间距统一为行间距和列间距的矩阵布局 */
  layout: NonNullable<IRMatrix['layout']> & {
    /** 矩阵行列间距的完整数值形式 */
    gap: {
      /** 相邻单元格行之间的净间距 */
      row: number;
      /** 相邻单元格列之间的净间距 */
      column: number;
    };
  };
  /** 分别解析的行索引与列索引，任一轴可独立关闭 */
  index: {
    /** 已解析的行索引，false 表示关闭 */
    row: CanonicalCollectionIndex;
    /** 已解析的列索引，false 表示关闭 */
    column: CanonicalCollectionIndex;
  };
};
