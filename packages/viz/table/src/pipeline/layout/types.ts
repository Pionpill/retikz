import type { BoundsRect } from '@retikz/math';

import type {
  IRTableAutoTrackSize,
  IRTableBorders,
  IRTableFixedTrackSize,
  IRTableFractionTrackSize,
  IRTableTrackOverride,
} from '../../schemas';

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

/** 已物化默认值的 Table layout 配置 */
export type ResolvedTableLayout = Readonly<{
  /** 默认 column 轨道尺寸 */
  columnSize: ResolvedTableTrackSize;
  /** 默认 body row 轨道尺寸 */
  rowSize: ResolvedTableTrackSize;
  /** 默认 columnHeader row 轨道尺寸 */
  headerRowSize: ResolvedTableTrackSize;
  /** canonical column 覆盖 */
  columns: ReadonlyArray<IRTableTrackOverride>;
  /** canonical row 覆盖 */
  rows: ReadonlyArray<IRTableTrackOverride>;
  /** 相邻列间距 */
  columnGap: number;
  /** 相邻行间距 */
  rowGap: number;
  /** 可选 Table border 模式与默认候选 */
  borders?: IRTableBorders;
}>;

/** canonical row 或 column 的已求解轨道几何 */
export type TableTrackLayout = Readonly<{
  /** optional semantic track id */
  id?: string;
  /** canonical 声明顺序 */
  index: number;
  /** Table 局部轴向偏移 */
  offset: number;
  /** 轨道尺寸 */
  size: number;
}>;

/** 单个 Cell 的完整布局几何 */
export type TableCellLayout = Readonly<{
  /** optional semantic Cell id */
  cellId?: string;
  /** Cell 左上角 bounds */
  box: BoundsRect;
  /** padding 收缩后的 content box */
  contentBox: BoundsRect;
  /** replay-root local 的 source allocation bounds */
  sourceAllocationBounds: BoundsRect;
  /** replay-root local 的 source visual bounds */
  sourceVisualOverflowBounds: BoundsRect;
  /** fit/alignment 后的 Table-local allocation bounds */
  contentAllocationBounds: BoundsRect;
  /** overflow policy 后的 Table-local visual bounds */
  visualOverflowBounds: BoundsRect;
}>;

/** Table 完整轨道与 Cell 布局结果 */
export type TableLayout = Readonly<{
  /** tracks + gaps 的 Table allocation bounds */
  allocationBounds: BoundsRect;
  /** 可见 Cell / border 的 Table-local union */
  visualOverflowBounds: BoundsRect;
  /** 与 semantic rows 同序的轨道 */
  rows: ReadonlyArray<TableTrackLayout>;
  /** 与 semantic columns 同序的轨道 */
  columns: ReadonlyArray<TableTrackLayout>;
  /** 与 semantic Cells 同序的几何 */
  cells: ReadonlyArray<TableCellLayout>;
}>;
