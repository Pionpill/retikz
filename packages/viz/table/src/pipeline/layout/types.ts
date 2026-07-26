import type { BoundsRect, Position } from '@retikz/math';

import type { IRTableAutoTrackSize, IRTableFixedTrackSize, IRTableFractionTrackSize } from '../../schemas';

/** 已物化运行时默认值的弹性轨道尺寸 */
export type ResolvedTableFractionTrackSize = Readonly<
  Omit<IRTableFractionTrackSize, 'weight'> & {
    /** 有限正弹性权重 */
    weight: number;
  }
>;

/** 已物化运行时默认值的 minmax 轨道尺寸 */
export type ResolvedTableMinmaxTrackSize = Readonly<{
  /** minmax 判别值 */
  kind: 'minmax';
  /** 固定或内容自然下界 */
  min: IRTableFixedTrackSize | IRTableAutoTrackSize;
  /** 固定、内容自然或已解析弹性上界 */
  max: IRTableFixedTrackSize | IRTableAutoTrackSize | ResolvedTableFractionTrackSize;
}>;

/** numeric solver 消费的轨道尺寸 */
export type ResolvedTableTrackSize =
  | IRTableFixedTrackSize
  | IRTableAutoTrackSize
  | ResolvedTableFractionTrackSize
  | ResolvedTableMinmaxTrackSize;

/** 单个 canonical 轨道的外部分配尺寸贡献 */
export type TableTrackContribution = Readonly<{
  /** canonical 轨道 index */
  trackIndex: number;
  /** finite nonnegative 外部分配尺寸 */
  size: number;
}>;

/** 单轴 Table 轨道求解输入 */
export type SolveTableTracksInput = Readonly<{
  /** 与 canonical 轨道同序的 resolved size */
  tracks: ReadonlyArray<ResolvedTableTrackSize>;
  /** 与内容类型无关的数值贡献 */
  contributions: ReadonlyArray<TableTrackContribution>;
  /** 相邻轨道间 finite nonnegative gap */
  gap: number;
  /** finite nonnegative 可用轴向空间，省略表示 unconstrained */
  availableSize?: number;
}>;

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
