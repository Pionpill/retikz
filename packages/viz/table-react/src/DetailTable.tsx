import type { RequireExactlyOne } from '@retikz/foundation';
import type { InputDetailTableConfig, InputTableDetailColumn } from '@retikz/table';
import { tableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { FC, ReactNode } from 'react';

import type { InputEmbeddableTableComponent, TableCommonProps, DetailTableDatasetProps } from './Table';
import { createReactTableInput, ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

type DetailTableRootProps = TableCommonProps & DetailTableDatasetProps & Omit<InputDetailTableConfig, 'columns'>;

/**
 * 明细表 React 组件的 props
 */
export type DetailTableProps = DetailTableRootProps &
  RequireExactlyOne<{
    /** 按显示顺序声明的完整明细列输入，与 children 互斥 */
    columns: Array<InputTableDetailColumn>;
    /** 按声明顺序收集的 DetailColumn markers，与 columns 互斥 */
    children: ReactNode;
  }>;

const DetailTableComponent: FC<DetailTableProps> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime(ReactTableRuntimeKind.Detail, props)} />
);

/** 从 records 与 columns 构造并渲染 detail Table */
export const DetailTable = DetailTableComponent as InputEmbeddableTableComponent<DetailTableProps>;
DetailTable.displayName = 'DetailTable';
DetailTable.isTier2Embeddable = true;
DetailTable.inputEmbedAdapter = tableInputEmbedAdapter;
DetailTable.createInputEmbedProps = props =>
  createReactTableInput(ReactTableRuntimeKind.Detail, props as DetailTableProps);
