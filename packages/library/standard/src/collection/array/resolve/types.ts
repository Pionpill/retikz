import type { CanonicalCell } from '../../_cell/resolve';
import type { CanonicalCollectionIndex } from '../../_index/resolve';
import type { IRArray } from '../schema';

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
  index: CanonicalCollectionIndex;
};
