import type { ManualTableInput } from '@retikz/table';
import type { FC, ReactNode } from 'react';

import { TableInputEmbedAdapter } from '@retikz/table-vanilla';

import type { InputEmbeddableTableComponent, TableCommonProps } from './Table';

import { createReactTableInput, ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

type ManualTableRootProps = TableCommonProps & Omit<ManualTableInput, 'rowKinds' | 'rows'>;

type ManualTableRowsPropsMode = {
  /** 与持久化契约相同的矩形行优先 Cell entries */
  rows: ManualTableInput['rows'];
  /** 可选的逐行语义类型，与 Row children 互斥 */
  rowKinds?: ManualTableInput['rowKinds'];
  /** 使用 rows 时不得传入 Row children */
  children?: never;
};

type ManualTableChildrenMode = {
  /** 使用 Row children 时不得传入 rows */
  rows?: never;
  /** 使用 Row children 时不得传入 rowKinds */
  rowKinds?: never;
  /** 按行声明的 Row markers，与 rows 和 rowKinds 互斥 */
  children: ReactNode;
};

/** 手工表 React 组件的 props */
export type ManualTableProps = ManualTableRootProps & (ManualTableRowsPropsMode | ManualTableChildrenMode);

const ManualTableComponent: FC<ManualTableProps> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime(ReactTableRuntimeKind.Manual, props)} />
);

/** 从矩形 rows 或 Row/Cell markers 构造并渲染 manual Table */
export const ManualTable = ManualTableComponent as InputEmbeddableTableComponent<ManualTableProps>;
ManualTable.displayName = 'ManualTable';
ManualTable.isTier2Embeddable = true;
ManualTable.inputEmbedAdapter = TableInputEmbedAdapter;
ManualTable.createInputEmbedProps = props =>
  createReactTableInput(ReactTableRuntimeKind.Manual, props as ManualTableProps);
