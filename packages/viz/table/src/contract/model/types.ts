import type { IRChild } from '@retikz/core';
import type { BoundsInsets } from '@retikz/math';

import type {
  IRTableCellBorders,
  IRTableCellPayload,
  TableCellFitValue,
  TableCellLocationValue,
  TableCellOverflowValue,
  TableCellRoleValue,
  TableHorizontalAlignmentValue,
  TableRowKindValue,
  TableVerticalAlignmentValue,
} from '../../schemas';
import type { DeepReadonly } from '../../shared';
import type { TableCellSource } from '../structure';

/** canonical Table row */
export type SemanticTableRow = Readonly<{
  /** 稳定 row id */
  id: string;
  /** canonical 声明顺序 */
  index: number;
  /** row 语义类型 */
  kind: TableRowKindValue;
  /** detail row 对应的外部数据索引 */
  sourceIndex?: number;
}>;

/** canonical Table column */
export type SemanticTableColumn = Readonly<{
  /** 稳定 column id */
  id: string;
  /** canonical 声明顺序 */
  index: number;
  /** detail column 对应的字段路径 */
  field?: string;
}>;

/** 已物化默认值的 Cell 矩形跨度 */
export type ResolvedTableCellSpan = Readonly<{
  /** 连续覆盖的 row 数量 */
  rows: number;
  /** 连续覆盖的 column 数量 */
  columns: number;
}>;

/** 已物化默认值的 Cell 布局策略 */
export type ResolvedTableCellLayout = Readonly<{
  /** Core 同源的四边 padding */
  padding: Readonly<BoundsInsets>;
  /** content box 内横向对齐 */
  horizontalAlign: TableHorizontalAlignmentValue;
  /** content box 内纵向对齐 */
  verticalAlign: TableVerticalAlignmentValue;
  /** 是否请求宽度约束重排 */
  wrap: boolean;
  /** 最终内容缩放策略 */
  fit: TableCellFitValue;
  /** 最终内容溢出策略 */
  overflow: TableCellOverflowValue;
  /** 可选 Cell 四侧 border 候选 */
  borders?: DeepReadonly<IRTableCellBorders>;
}>;

/** canonical Table Cell */
export type SemanticTableCell = Readonly<{
  /** 稳定 Cell id */
  id: string;
  /** 所属 row id */
  rowId: string;
  /** 所属 column id */
  columnId: string;
  /** 所属 row 的 canonical index */
  rowIndex: number;
  /** 所属 column 的 canonical index */
  columnIndex: number;
  /** Cell 语义位置 */
  location: TableCellLocationValue;
  /** Cell 语义角色 */
  roles: ReadonlyArray<TableCellRoleValue>;
  /** Cell value 或直接内容 */
  payload: DeepReadonly<IRTableCellPayload>;
  /** 已解析的矩形跨度 */
  span: ResolvedTableCellSpan;
  /** 已解析的 Cell 布局策略 */
  layout: ResolvedTableCellLayout;
  /** 可用的最小来源信息 */
  source?: TableCellSource;
}>;

/** 所有 structure 共同输出的 canonical Table 语义模型 */
export type SemanticTableModel = Readonly<{
  /** canonical rows */
  rows: ReadonlyArray<SemanticTableRow>;
  /** canonical columns */
  columns: ReadonlyArray<SemanticTableColumn>;
  /** canonical Cells */
  cells: ReadonlyArray<SemanticTableCell>;
}>;

/** 已解析为 Core 内容的 Cell */
export type PresentedTableCell = Readonly<{
  /** 对应 semantic Cell 的稳定 id */
  cellId: string;
  /** detached、递归冻结的 Core 内容 */
  content: IRChild;
}>;

/** 保留 canonical identity 的 Table presentation 视图 */
export type PresentedTableModel = Readonly<{
  /** 同一个递归冻结的 canonical model 引用 */
  semantic: SemanticTableModel;
  /** 与 semantic Cells 等长、同序的呈现内容 */
  cells: ReadonlyArray<PresentedTableCell>;
}>;
