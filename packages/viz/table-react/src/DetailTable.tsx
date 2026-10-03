import type { DetailTableInput, TableDetailColumnInput } from '@retikz/table';
import { TableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { FC, ReactNode } from 'react';

import type { InputEmbeddableDataTableComponent, TableCommonProps, DetailTableDatasetProps } from './Table';
import { createReactTableInput, ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

type DetailTableRootProps<TSource = never> = TableCommonProps &
  DetailTableDatasetProps<TSource> &
  Omit<DetailTableInput, 'columns'>;

type DetailTableColumnPropsMode = {
  /** 按显示顺序声明的完整明细列输入，与 children 互斥 */
  columns: Array<TableDetailColumnInput>;
  /** 使用 columns 时不得传入 DetailColumn children */
  children?: never;
};

type DetailTableColumnChildrenMode = {
  /** 使用 DetailColumn children 时不得传入 columns */
  columns?: never;
  /** 按声明顺序收集的 DetailColumn markers，与 columns 互斥 */
  children: ReactNode;
};

/** 明细表 React 组件的 props */
export type DetailTableProps<TSource = never> = DetailTableRootProps<TSource> &
  (DetailTableColumnPropsMode | DetailTableColumnChildrenMode);

const DetailTableComponent: FC<DetailTableProps<unknown>> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime(ReactTableRuntimeKind.Detail, props)} />
);

/** 从 records 与 columns 构造并渲染 detail Table */
export const DetailTable = DetailTableComponent as InputEmbeddableDataTableComponent<DetailTableProps<unknown>>;
DetailTable.displayName = 'DetailTable';
DetailTable.isTier2Embeddable = true;
DetailTable.inputEmbedAdapter = TableInputEmbedAdapter;
DetailTable.createInputEmbedProps = props =>
  createReactTableInput(ReactTableRuntimeKind.Detail, props as DetailTableProps<unknown>);
