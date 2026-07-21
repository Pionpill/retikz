import type { ManualTableSpecInput } from '@retikz/table';
import type { FC } from 'react';

import type { EmbeddableTableComponent, TableCommonProps } from './Table';

import { manualTableEmbeddableAdapter } from './embedded-runtime';
import { resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

/** manual-only React Table props */
export type ManualTableProps = TableCommonProps & ManualTableSpecInput;

const ManualTableComponent: FC<ManualTableProps> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime('manual', props)} />
);

/** 从显式 dimensions 与 Cells 构造并渲染 manual Table */
export const ManualTable = ManualTableComponent as EmbeddableTableComponent<ManualTableProps>;
ManualTable.displayName = 'ManualTable';
ManualTable.isTier2Embeddable = true;
ManualTable.embeddableAdapter = manualTableEmbeddableAdapter;
