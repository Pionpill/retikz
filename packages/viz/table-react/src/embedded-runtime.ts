import type { EmbeddableTier2Adapter } from '@retikz/react';

import { createTableRuntimeContribution } from '@retikz/table';

import type { DetailTableProps } from './DetailTable';
import type { ManualTableProps } from './ManualTable';
import type { TableProps } from './Table';
import type { ReactTableRuntimeKindValue } from './table-runtime';

import { ReactTableRuntimeKind, resolveReactTableRuntime } from './table-runtime';

/** 创建一个具备独立组件身份、共享 Table contribution 合同的 React adapter */
const createEmbeddableAdapter = <TProps extends TableProps | DetailTableProps | ManualTableProps>(
  displayName: string,
  kind: ReactTableRuntimeKindValue,
): EmbeddableTier2Adapter<TProps> => ({
  displayName,
  contribute: props => {
    const runtime = resolveReactTableRuntime(kind, props, { embedded: true });
    const reference = runtime.spec.id;
    if (reference === undefined) throw new Error('table react: internal embedded Table reference is missing');
    const contribution = createTableRuntimeContribution({
      reference,
      data: runtime.datasets,
      lowerOptions: runtime.lowerOptions,
      composites: runtime.composites,
    });
    return { node: runtime.spec, providerDependencies: contribution };
  },
});

/** `<Table>` 的 embeddable adapter */
export const tableEmbeddableAdapter = createEmbeddableAdapter<TableProps>('Table', ReactTableRuntimeKind.Table);

/** `<DetailTable>` 的 embeddable adapter */
export const detailTableEmbeddableAdapter = createEmbeddableAdapter<DetailTableProps>(
  'DetailTable',
  ReactTableRuntimeKind.Detail,
);

/** `<ManualTable>` 的 embeddable adapter */
export const manualTableEmbeddableAdapter = createEmbeddableAdapter<ManualTableProps>(
  'ManualTable',
  ReactTableRuntimeKind.Manual,
);
