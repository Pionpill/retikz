import type { BoundsRect, Position } from '@retikz/math';

/** 已物化默认值的固定轨道 layout 配置 */
export type ResolvedTableLayoutSpec = Readonly<{
  /** 统一列宽 */
  columnWidth: number;
  /** body row 统一高度 */
  rowHeight: number;
  /** columnHeader row 统一高度 */
  headerHeight: number;
  /** 相邻列间距 */
  columnGap: number;
  /** 相邻行间距 */
  rowGap: number;
}>;

/** canonical row 或 column 的固定轨道几何 */
export type TableTrackLayout = Readonly<{
  /** semantic track id */
  id: string;
  /** canonical 声明顺序 */
  index: number;
  /** Table 局部轴向偏移 */
  offset: number;
  /** 轨道尺寸 */
  size: number;
}>;

/** 单个 Cell 的固定轨道几何 */
export type TableCellLayout = Readonly<{
  /** semantic Cell id */
  cellId: string;
  /** Cell 左上角 bounds */
  box: BoundsRect;
  /** 固定轨道内容局部原点的目标中心 */
  contentCenter: Position;
}>;

/** Table 固定轨道布局结果 */
export type TableLayout = Readonly<{
  /** Table 左上角 bounds */
  bounds: BoundsRect;
  /** 与 semantic rows 同序的轨道 */
  rows: ReadonlyArray<TableTrackLayout>;
  /** 与 semantic columns 同序的轨道 */
  columns: ReadonlyArray<TableTrackLayout>;
  /** 与 semantic Cells 同序的几何 */
  cells: ReadonlyArray<TableCellLayout>;
}>;
