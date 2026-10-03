import type { AnyCompositeDefinition } from '@retikz/core';
import type {
  ExternalDatasets,
  ExternalRow,
  DataInputBindings,
  DataTransformExecutor,
  IRDataExecution,
} from '@retikz/data';
import type { LayoutExtensions, LayoutProps } from '@retikz/react';
import type { IRTable, LowerTablesOptions, TableLayoutManifest } from '@retikz/table';
import type { InputTable } from '@retikz/table-vanilla';
import { TableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { createReactTableInput, ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

/** Table standalone 入口复用的 Kernel Layout 宿主 props */
export type TableLayoutHostProps = Pick<
  LayoutProps & LayoutExtensions,
  | 'handlers'
  | 'width'
  | 'height'
  | 'viewBox'
  | 'theme'
  | 'themeStyles'
  | 'className'
  | 'renderer'
  | 'animate'
  | 'snapshotAt'
  | 'animationRef'
  | 'animations'
  | 'easings'
  | 'animationProperties'
  | 'idPrefix'
  | 'nodeDistance'
  | 'fontSize'
  | 'shapes'
  | 'boundaries'
  | 'clips'
  | 'arrows'
  | 'patterns'
  | 'pathGenerators'
  | 'pathKinds'
  | 'lowerTex'
> & {
  /** standalone Layout 宿主容器的 CSS 样式 */
  containerStyle?: LayoutProps['style'];
};

/** 三个 Table 组件共享的宿主展示与 lowering props */
export type TableCommonProps = TableLayoutHostProps &
  LowerTablesOptions & {
    /** Cell 内嵌 Tier 2 内容所需的额外 composite definitions */
    composites?: ReadonlyArray<AnyCompositeDefinition>;
    /** standalone 渲染后接收 Table layout manifest */
    onManifest?: (manifest: TableLayoutManifest) => void;
  };

/** 通用 `<Table>` props */
export type TableDataRuntimeProps<TSource = never> = Readonly<{
  /** 本次请求的数据执行器 */
  dataTransformExecutor?: DataTransformExecutor<TSource>;
  /** 请求取消信号 */
  signal?: AbortSignal;
}>;

/** 通用Table运行时数据入口，与bindings二选一 */
export type TableDatasetProps<TSource = never> = TableDataRuntimeProps<TSource> &
  ({ data?: ExternalDatasets; dataBindings?: never } | { data?: never; dataBindings: DataInputBindings<TSource> });

/** DetailTable运行时数据入口，与bindings二选一 */
export type DetailTableDatasetProps<TSource = never> = TableDataRuntimeProps<TSource> &
  ({ data: Array<ExternalRow>; dataBindings?: never } | { data?: never; dataBindings: DataInputBindings<TSource> });

/** 通用Table的精确作者输入 */
export type TableProps<TSource = never> = TableCommonProps &
  TableDatasetProps<TSource> & {
    /** 已构造的完整 Table IR */
    spec: IRTable;
    /** 覆盖 spec 的根执行配置；两处同时提供时拒绝重复声明 */
    dataExecution?: IRDataExecution;
  };

/** 带静态 Tier 2 adapter 的 Table React 组件 */
export type InputEmbeddableTableComponent<TProps> = FC<TProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: InputEmbedAdapter<InputTable<unknown>>;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => InputTable<unknown>;
};

type TableAuthorProps<TProps> = TProps extends unknown
  ? Omit<TProps, 'data' | 'dataBindings' | 'dataTransformExecutor' | 'signal'>
  : never;

/** 泛型Table入口保留原生源与执行器的关联 */
export type InputEmbeddableDataTableComponent<TProps> = (<TSource = never>(
  props: TableAuthorProps<TProps> &
    (TProps extends { spec: IRTable } ? TableDatasetProps<TSource> : DetailTableDatasetProps<TSource>),
) => ReturnType<FC<TProps>>) & {
  displayName?: string;
  isTier2Embeddable: true;
  inputEmbedAdapter: InputEmbedAdapter<InputTable<unknown>>;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => InputTable<unknown>;
};

const TableComponent: FC<TableProps<unknown>> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime(ReactTableRuntimeKind.Table, props)} />
);

/** 渲染任意合法 Table spec 的通用 React 入口 */
export const Table = TableComponent as InputEmbeddableDataTableComponent<TableProps<unknown>>;
Table.displayName = 'Table';
Table.isTier2Embeddable = true;
Table.inputEmbedAdapter = TableInputEmbedAdapter;
Table.createInputEmbedProps = props => createReactTableInput(ReactTableRuntimeKind.Table, props as TableProps<unknown>);
