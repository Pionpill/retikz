import type { ManualTableSpecInput } from '@retikz/table';
import type { FC, ReactNode } from 'react';

import type { EmbeddableTableComponent, TableCommonProps } from './Table';

import { manualTableEmbeddableAdapter } from './embedded-runtime';
import { ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

type ManualTableRootProps = TableCommonProps & Omit<ManualTableSpecInput, 'rows' | 'rowKinds'>;

type ManualTableRowsPropsMode = {
  /** 与持久化契约相同的矩形行优先 Cell entries */
  rows: ManualTableSpecInput['rows'];
  /** 可选的逐行语义类型，与 Row children 互斥 */
  rowKinds?: ManualTableSpecInput['rowKinds'];
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
export const ManualTable = ManualTableComponent as EmbeddableTableComponent<ManualTableProps>;
ManualTable.displayName = 'ManualTable';
ManualTable.isTier2Embeddable = true;
ManualTable.embeddableAdapter = manualTableEmbeddableAdapter;
