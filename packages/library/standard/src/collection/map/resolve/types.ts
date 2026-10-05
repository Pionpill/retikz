import type { CanonicalCell } from '../../_cell/resolve';
import type { IRMap } from '../schema';

/** 默认、行列间距与单元格继承已解析的 Map */
export type CanonicalMap = Omit<IRMap, 'data' | 'entries' | 'layout' | 'dataExpand' | 'skeleton'> & {
  /** 按作者顺序解析的键格和值格，每个角色独立完成样式继承 */
  entries: Array<{
    /** 已完成继承与默认值补全的键单元格 */
    key: CanonicalCell;
    /** 已完成继承与默认值补全的值单元格 */
    value: CanonicalCell;
  }>;
  /** 已将间距统一为行间距和列间距的集合布局 */
  layout: Omit<NonNullable<IRMap['layout']>, 'gap'> & {
    /** 键值对的行列净间距 */
    gap: {
      /** 相邻条目之间的行间距 */
      row: number;
      /** 键列与值列之间的间距 */
      column: number;
    };
  };
};
