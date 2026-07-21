import type { ExternalRow } from '@retikz/data';
import type { DetailTableSpecInput } from '@retikz/table';
import type { FC } from 'react';

import type { EmbeddableTableComponent, TableCommonProps } from './Table';

import { detailTableEmbeddableAdapter } from './embedded-runtime';
import { resolveReactTableRuntime } from './table-runtime';
import { TableRuntimeView } from './table-view';

/** detail-only React Table props */
export type DetailTableProps = TableCommonProps &
  DetailTableSpecInput & {
    /** dataRef 对应的运行时数据行 */
    data: Array<ExternalRow>;
  };

const DetailTableComponent: FC<DetailTableProps> = props => (
  <TableRuntimeView runtime={resolveReactTableRuntime('detail', props)} />
);

/** 从 records 与 columns 构造并渲染 detail Table */
export const DetailTable = DetailTableComponent as EmbeddableTableComponent<DetailTableProps>;
DetailTable.displayName = 'DetailTable';
DetailTable.isTier2Embeddable = true;
DetailTable.embeddableAdapter = detailTableEmbeddableAdapter;
