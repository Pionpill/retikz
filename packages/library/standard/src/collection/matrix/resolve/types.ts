import type { CanonicalCell } from '../../_cell/resolve';
import type { IRMatrix, IRMatrixAxisIndex } from '../schema';

/** 已补全默认值的单轴索引 */
export type CanonicalMatrixAxisIndex =
  | false
  | (Omit<IRMatrixAxisIndex, 'position' | 'start' | 'labels'> & {
      /** 当前轴索引在矩阵前侧或后侧的放置位置 */
      position: 'before' | 'after';
    } & (
        | {
            /** 当前轴自动递增索引的起始数值，与显式标签互斥 */
            start: number;
            labels?: never;
          }
        | {
            /** 当前轴按顺序排列的显式索引标签，与起始数值互斥 */
            labels: Array<string>;
            start?: never;
          }
      ));

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
    row: CanonicalMatrixAxisIndex;
    /** 已解析的列索引，false 表示关闭 */
    column: CanonicalMatrixAxisIndex;
  };
};
