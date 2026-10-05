import type { IRGrid, IRGridLine } from '..';
import type { GridNumericBounds } from '../geometry';

/** Grid 的确定方向配置 */
export type CanonicalGridLine = Omit<IRGridLine, 'spacing' | 'origin' | 'includeBoundary' | 'major'> & {
  /** 相邻普通网格线在当前方向上的间距 */
  spacing: number;
  /** 当前方向格点坐标的已确定原点 */
  origin: number;
  /** 是否在网格边界补画线条 */
  includeBoundary: boolean;
  /** 已补齐序列偏移的主网格线配置 */
  major?: NonNullable<IRGridLine['major']> & {
    /** 主网格线在普通网格序列中的索引偏移 */
    offset: number;
  };
};

/** 已确定边界、线条和边框的 Grid */
export type CanonicalGrid = Omit<IRGrid, 'bounds' | 'line' | 'border'> & {
  /** 统一投影到局部坐标的数值范围 */
  bounds: GridNumericBounds;
  /** 关闭全部网格线，或分别提供纵向和横向的已解析配置 */
  line:
    | false
    | {
        /** 竖直网格线的已解析间距、原点与样式 */
        vertical: CanonicalGridLine;
        /** 水平网格线的已解析间距、原点与样式 */
        horizontal: CanonicalGridLine;
      };
  /** 已补齐外扩间距、绘制顺序与线条延伸策略的边框 */
  border?: NonNullable<IRGrid['border']> &
    Required<Pick<NonNullable<IRGrid['border']>, 'padding' | 'order' | 'extendLines'>>;
};
