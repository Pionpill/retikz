import type { IRTableCell, ManualTableSpecInput, TableRowKindValue } from '@retikz/table';
import type { FC, ReactNode } from 'react';

import type { EmbeddableTableComponent, TableCommonProps } from './Table';

import { manualTableEmbeddableAdapter } from './embedded-runtime';
import { ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

type ManualTableRootProps = TableCommonProps & Omit<ManualTableSpecInput, 'cells' | 'rowKinds'>;

type ManualTableCellPropsMode = {
  /** 可选的逐行语义类型，与 Row children 互斥 */
  rowKinds?: Array<TableRowKindValue>;
  /** 带显式地址的完整 Cell 输入，与 children 互斥 */
  cells: Array<IRTableCell>;
  /** 使用 cells 时不得传入 Row children */
  children?: never;
};

type ManualTableCellChildrenMode = {
  /** 使用 Row children 时不得传入 rowKinds */
  rowKinds?: never;
  /** 使用 Row children 时不得传入 cells */
  cells?: never;
  /** 按行声明的 Row markers，与 cells 和 rowKinds 互斥 */
  children: ReactNode;
};

/** 手工表 React 组件的 props */
export type ManualTableProps = ManualTableRootProps & (ManualTableCellPropsMode | ManualTableCellChildrenMode);

const ManualTableComponent: FC<ManualTableProps> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime(ReactTableRuntimeKind.Manual, props)} />
);

/** 从显式 dimensions 与 Cells 构造并渲染 manual Table */
export const ManualTable = ManualTableComponent as EmbeddableTableComponent<ManualTableProps>;
ManualTable.displayName = 'ManualTable';
ManualTable.isTier2Embeddable = true;
ManualTable.embeddableAdapter = manualTableEmbeddableAdapter;
