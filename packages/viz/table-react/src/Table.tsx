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

/**
 * 通用 `<Table>` props
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type TableDataRuntimeProps<TSource = never> = Readonly<{
  /** 本次请求的数据执行器 */
  dataTransformExecutor?: DataTransformExecutor<TSource>;
  /** 请求取消信号 */
  signal?: AbortSignal;
}>;

/**
 * 通用Table运行时数据入口，与bindings二选一
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type TableDatasetProps<TSource = never> = TableDataRuntimeProps<TSource> &
  (
    | {
        /** 按引用名称提供的行数据集，与 dataBindings 互斥 */
        data?: ExternalDatasets;
        dataBindings?: never;
      }
    | {
        data?: never;
        /** 具名行数据、计算结果或原生源绑定，与 data 互斥 */
        dataBindings: DataInputBindings<TSource>;
      }
  );

/**
 * DetailTable运行时数据入口，与bindings二选一
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type DetailTableDatasetProps<TSource = never> = TableDataRuntimeProps<TSource> &
  (
    | {
        /** 明细表直接消费的行数据，与 dataBindings 互斥 */
        data: Array<ExternalRow>;
        dataBindings?: never;
      }
    | {
        data?: never;
        /** 明细表按引用名称消费的数据绑定，与 data 互斥 */
        dataBindings: DataInputBindings<TSource>;
      }
  );

/**
 * 通用Table的精确作者输入
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type TableProps<TSource = never> = TableCommonProps &
  TableDatasetProps<TSource> & {
    /** 已构造的完整 Table IR */
    spec: IRTable;
    /** 覆盖 spec 的根执行配置；两处同时提供时拒绝重复声明 */
    dataExecution?: IRDataExecution;
  };

/**
 * 带静态 Tier 2 adapter 的 Table React 组件
 * @template TProps 可嵌入 Table 组件接受的属性类型
 */
export type InputEmbeddableTableComponent<TProps> = FC<TProps> & {
  /** 标识可由 Core React 收集的 Tier 2 表格组件 */
  isTier2Embeddable: true;
  /** 将 Table 输入接入 Core 的领域 adapter */
  inputEmbedAdapter: InputEmbedAdapter<InputTable<unknown>>;
  /** 将作者属性转换为 Vanilla Table 输入 */
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => InputTable<unknown>;
};

type TableAuthorProps<TProps> = TProps extends unknown
  ? Omit<TProps, 'data' | 'dataBindings' | 'dataTransformExecutor' | 'signal'>
  : never;

/**
 * 泛型Table入口保留原生源与执行器的关联
 * @template TProps 决定普通 Table 或 DetailTable 作者属性及数据绑定形态的基础属性类型
 */
export type InputEmbeddableDataTableComponent<TProps> = (<TSource = never>(
  props: TableAuthorProps<TProps> &
    (TProps extends { spec: IRTable } ? TableDatasetProps<TSource> : DetailTableDatasetProps<TSource>),
) => ReturnType<FC<TProps>>) & {
  /** React 调试工具中显示的组件名 */
  displayName?: string;
  /** 标识可由 Core React 收集的 Tier 2 表格组件 */
  isTier2Embeddable: true;
  /** 将 Table 输入接入 Core 的领域 adapter */
  inputEmbedAdapter: InputEmbedAdapter<InputTable<unknown>>;
  /** 将作者属性转换为 Vanilla Table 输入 */
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
