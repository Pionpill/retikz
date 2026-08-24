import type { IRChild } from '@retikz/core';
import type { IRDataScalarValue } from '@retikz/data';
import type { BoundsInsets } from '@retikz/math';

import type {
  IRTableCellAppearance,
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
  /** 可选稳定 row id */
  id?: string;
  /** canonical 声明顺序 */
  index: number;
  /** row 语义类型 */
  kind: TableRowKindValue;
  /** detail row 对应的外部数据索引 */
  sourceIndex?: number;
}>;

/** canonical Table column */
export type SemanticTableColumn = Readonly<{
  /** 可选稳定 column id */
  id?: string;
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
  /** 可选稳定 Cell id */
  id?: string;
  /** 可选所属 row id */
  rowId?: string;
  /** 可选所属 column id */
  columnId?: string;
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

/** formatter 与 presentation 共用的最小 Cell 上下文 */
export type TableCellContext = Readonly<{
  /** 可选稳定 Cell id */
  cellId?: string;
  /** 可选所属 row id */
  rowId?: string;
  /** 可选所属 column id */
  columnId?: string;
  /** canonical row index */
  rowIndex: number;
  /** canonical column index */
  columnIndex: number;
  /** Cell 语义位置 */
  location: TableCellLocationValue;
  /** Cell 语义角色 */
  roles: ReadonlyArray<TableCellRoleValue>;
  /** 可选最小来源信息 */
  source?: TableCellSource;
}>;

/** formatter 阶段完成的 Cell */
export type FormattedTableCell =
  | Readonly<{
      /** value Cell 判别字段 */
      kind: 'value';
      /** 对应 semantic Cell 的可选 id */
      cellId?: string;
      /** formatter 前的 canonical scalar */
      rawValue: IRDataScalarValue;
      /** formatter 产生的展示 scalar */
      value: IRDataScalarValue;
      /** 实际执行的 formatter 名称 */
      formatterName: string;
    }>
  | Readonly<{
      /** direct content Cell 判别字段 */
      kind: 'content';
      /** 对应 semantic Cell 的可选 id */
      cellId?: string;
      /** detached、递归冻结的 Core child */
      content: IRChild;
    }>;

/** 保留 canonical identity 与顺序的 formatter 阶段模型 */
export type FormattedTableModel = Readonly<{
  /** formatter 输入的 canonical semantic model */
  semantic: SemanticTableModel;
  /** 与 semantic Cells 等长、同序的 formatter 结果 */
  cells: ReadonlyArray<FormattedTableCell>;
}>;

/** 已解析为 Core 内容并保留 provider trace 的 Cell */
export type PresentedTableCell =
  | Readonly<{
      /** value Cell 判别字段 */
      kind: 'value';
      /** 对应 semantic Cell 的可选 id */
      cellId?: string;
      /** formatter 前的 canonical scalar */
      rawValue: IRDataScalarValue;
      /** formatter 产生的展示 scalar */
      value: IRDataScalarValue;
      /** 实际执行的 formatter 名称 */
      formatterName: string;
      /** 实际执行的 presentation 名称 */
      presentationName: string;
      /** detached、递归冻结的最终视觉输入 */
      appearance: DeepReadonly<IRTableCellAppearance>;
      /** detached、递归冻结的 Core 内容 */
      content: IRChild;
    }>
  | Readonly<{
      /** direct content Cell 判别字段 */
      kind: 'content';
      /** 对应 semantic Cell 的可选 id */
      cellId?: string;
      /** detached、递归冻结的最终视觉输入 */
      appearance: DeepReadonly<IRTableCellAppearance>;
      /** detached、递归冻结的 Core 内容 */
      content: IRChild;
    }>;

/** 保留 canonical identity 的 Table presentation 视图 */
export type PresentedTableModel = Readonly<{
  /** formatter snapshot 中同一个递归冻结的 canonical model 引用 */
  semantic: SemanticTableModel;
  /** 与 semantic Cells 等长、同序的呈现内容 */
  cells: ReadonlyArray<PresentedTableCell>;
}>;
