import type { AnyCompositeDefinition } from '@retikz/core';
import type { DataTransformResult, ExternalRow, IRDataExecution } from '@retikz/data';
import type { RequireExactlyOne } from '@retikz/foundation';
import type { LayoutProps } from '@retikz/react';
import type { CompileOptions } from '@retikz/reconciler';
import type { IRTable, TablesLoweringOptions, TableLayoutManifest } from '@retikz/table';
import type { InputTable, InputTableData } from '@retikz/table-vanilla';
import { tableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { CSSProperties, FC } from 'react';

import { createReactTableInput, ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

/** Table standalone 入口复用的 Kernel Layout 宿主 props */
export type TableLayoutHostProps = Pick<
  LayoutProps & CompileOptions,
  | 'handlers'
  | 'width'
  | 'height'
  | 'viewBox'
  | 'theme'
  | 'themeDefinitions'
  | 'className'
  | 'renderer'
  | 'animate'
  | 'snapshotAt'
  | 'animationRef'
  | 'animations'
  | 'idPrefix'
  | 'nodeDistance'
  | 'fontSize'
  | 'shapes'
  | 'boundaries'
  | 'clips'
  | 'arrows'
  | 'patterns'
  | 'paths'
  | 'lowerTex'
> & {
  /** standalone Layout 宿主容器的 CSS 样式 */
  containerStyle?: CSSProperties;
};

/** 三个 Table 组件共享的宿主展示与 lowering props */
export type TableCommonProps = TableLayoutHostProps &
  TablesLoweringOptions & {
    /** Cell 内嵌 Tier 2 内容所需的额外 composite definitions */
    composites?: ReadonlyArray<AnyCompositeDefinition>;
    /** standalone 渲染后接收 Table layout manifest */
    onManifest?: (manifest: TableLayoutManifest) => void;
  };

/** 通用 Table 使用与 Vanilla 一致的行数据或就绪结果 */
export type TableDatasetProps = InputTableData;

/**
 * 明细表接收行数据或就绪结果
 */
export type DetailTableDatasetProps = RequireExactlyOne<{
  /** 明细表直接消费的行数据，与 preparedData 互斥 */
  data: Array<ExternalRow>;
  /** 明细表已完成的数据计算，与 data 互斥 */
  preparedData: DataTransformResult;
}>;

/**
 * 通用Table的精确作者输入
 */
export type TableProps = TableCommonProps &
  TableDatasetProps & {
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
  inputEmbedAdapter: InputEmbedAdapter<InputTable>;
  /** 将作者属性转换为 Vanilla Table 输入 */
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => InputTable;
};

const TableComponent: FC<TableProps> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime(ReactTableRuntimeKind.Table, props)} />
);

/** 渲染任意合法 Table spec 的通用 React 入口 */
export const Table = TableComponent as InputEmbeddableTableComponent<TableProps>;
Table.displayName = 'Table';
Table.isTier2Embeddable = true;
Table.inputEmbedAdapter = tableInputEmbedAdapter;
Table.createInputEmbedProps = props => createReactTableInput(ReactTableRuntimeKind.Table, props as TableProps);
