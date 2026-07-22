import type { CompositeDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { EmbeddableTier2Adapter, LayoutProps } from '@retikz/react';
import type { IRTableSpec, LowerTablesOptions, TableLayoutManifest } from '@retikz/table';
import type { FC } from 'react';

import { tableEmbeddableAdapter } from './embedded-runtime';
import { ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

/** 三个 Table 组件共享的宿主展示与 lowering props */
export type TableCommonProps = Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'renderer'> &
  LowerTablesOptions & {
    /** Cell 内嵌 Tier 2 内容所需的额外 composite definitions */
    composites?: ReadonlyArray<CompositeDefinition>;
    /** standalone 渲染后接收 Table layout manifest */
    onManifest?: (manifest: TableLayoutManifest) => void;
  };

/** 通用 `<Table>` props */
export type TableProps = TableCommonProps & {
  /** 已构造的完整 Table IR */
  spec: IRTableSpec;
  /** 按 spec data reference 索引的外部 datasets */
  data?: ExternalDatasets;
};

/** 带静态 Tier 2 adapter 的 Table React 组件 */
export type EmbeddableTableComponent<TProps> = FC<TProps> & {
  isTier2Embeddable: true;
  embeddableAdapter: EmbeddableTier2Adapter<TProps>;
};

const TableComponent: FC<TableProps> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime(ReactTableRuntimeKind.Table, props)} />
);

/** 渲染任意合法 Table spec 的通用 React 入口 */
export const Table = TableComponent as EmbeddableTableComponent<TableProps>;
Table.displayName = 'Table';
Table.isTier2Embeddable = true;
Table.embeddableAdapter = tableEmbeddableAdapter;
