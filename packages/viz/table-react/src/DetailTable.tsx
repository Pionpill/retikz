import type { RequireExactlyOne } from '@retikz/foundation';
import type { InputDetailTableConfig, InputTableDetailColumn } from '@retikz/table';
import { tableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { FC, ReactNode } from 'react';

import type { InputEmbeddableDataTableComponent, TableCommonProps, DetailTableDatasetProps } from './Table';
import { createReactTableInput, ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

type DetailTableRootProps<TSource = never> = TableCommonProps &
  DetailTableDatasetProps<TSource> &
  Omit<InputDetailTableConfig, 'columns'>;

/**
 * 明细表 React 组件的 props
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type DetailTableProps<TSource = never> = DetailTableRootProps<TSource> &
  RequireExactlyOne<{
    /** 按显示顺序声明的完整明细列输入，与 children 互斥 */
    columns: Array<InputTableDetailColumn>;
    /** 按声明顺序收集的 DetailColumn markers，与 columns 互斥 */
    children: ReactNode;
  }>;

const DetailTableComponent: FC<DetailTableProps<unknown>> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime(ReactTableRuntimeKind.Detail, props)} />
);

/** 从 records 与 columns 构造并渲染 detail Table */
export const DetailTable = DetailTableComponent as InputEmbeddableDataTableComponent<DetailTableProps<unknown>>;
DetailTable.displayName = 'DetailTable';
DetailTable.isTier2Embeddable = true;
DetailTable.inputEmbedAdapter = tableInputEmbedAdapter;
DetailTable.createInputEmbedProps = props =>
  createReactTableInput(ReactTableRuntimeKind.Detail, props as DetailTableProps<unknown>);
