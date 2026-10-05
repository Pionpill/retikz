import type { CanonicalCell } from '../../_cell/resolve';
import type { IRArray, IRArrayIndexOptions } from '../schema';

/** 默认与单元格继承已解析的 Array */
export type CanonicalArray = Omit<
  IRArray,
  'data' | 'items' | 'layout' | 'index' | 'cellIdMode' | 'dataExpand' | 'skeleton'
> & {
  /** 按作者顺序解析并完成继承的格子 */
  items: Array<CanonicalCell>;
  /** 已确定单轴方向与格间距的集合布局 */
  layout: NonNullable<IRArray['layout']> & {
    /** 单元格沿行或列排列的已确定方向 */
    direction: 'row' | 'column';
    /** 相邻单元格之间的净间距 */
    gap: number;
  };
  /** 关闭索引，或已确定位置的自动编号／显式标签配置 */
  index:
    | false
    | (Omit<IRArrayIndexOptions, 'start' | 'labels' | 'position'> & {
        /** 索引位于横向数组的上侧或下侧、纵向数组的左侧或右侧 */
        position: 'before' | 'after';
      } & (
          | {
              /** 自动递增索引的起始数值，与显式标签互斥 */
              start: number;
              labels?: never;
            }
          | {
              /** 按单元格顺序提供的显式索引标签，与起始数值互斥 */
              labels: Array<string>;
              start?: never;
            }
        ));
};
