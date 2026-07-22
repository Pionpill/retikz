import type { CompositeDefinition, ValueOf } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { LayoutProps } from '@retikz/react';
import type {
  IRDetailTableSpec,
  IRManualTableSpec,
  IRTableSpec,
  LowerTablesOptions,
  ManualTableSpecInput,
  TableDetailColumnInput,
  TableLayoutManifest,
} from '@retikz/table';

import { createDetailTableSpec, createManualTableSpec, TableSpecSchema } from '@retikz/table';

import type { DetailTableProps } from './DetailTable';
import type { ManualTableProps } from './ManualTable';
import type { TableCommonProps, TableProps } from './Table';

import { buildDetailColumns } from './components/build-detail-columns';
import { buildManualStructure } from './components/build-manual-structure';

/** React Table runtime 的入口类型 */
export const ReactTableRuntimeKind = {
  /** 通用 TableSpec 入口 */
  Table: 'table',
  /** detail authoring 入口 */
  Detail: 'detail',
  /** manual authoring 入口 */
  Manual: 'manual',
} as const;

/** React Table runtime 入口类型取值 */
export type ReactTableRuntimeKindValue = ValueOf<typeof ReactTableRuntimeKind>;

/** 三个 React Table 组件共享的规范化运行时输入 */
export type ReactTableRuntime = Readonly<{
  /** 已通过 Table schema 的根 spec */
  spec: IRTableSpec;
  /** Table lowering 消费的外部 datasets */
  datasets: ExternalDatasets;
  /** Table definitions 与其它 lowering 选项 */
  lowerOptions: LowerTablesOptions;
  /** Cell 内嵌 Tier 2 内容所需的额外 composites */
  composites: ReadonlyArray<CompositeDefinition>;
  /** standalone 模式的 manifest observer */
  onManifest?: (manifest: TableLayoutManifest) => void;
  /** 透传给 Layout 的展示 props */
  display: Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'renderer'>;
}>;

type AnyTableProps = TableProps | DetailTableProps | ManualTableProps;

/** 从共享 props 提取 Table lowering options */
const lowerOptionsOf = (props: TableCommonProps): LowerTablesOptions => ({
  structureDefinitions: props.structureDefinitions,
  presentationDefinitions: props.presentationDefinitions,
});

/** 从共享 props 提取 React Layout 展示选项 */
const displayOf = (props: TableCommonProps): ReactTableRuntime['display'] => ({
  width: props.width,
  height: props.height,
  className: props.className,
  style: props.style,
  renderer: props.renderer,
});

/** 统一 DetailTable 的 columns props 与 marker children authoring */
const detailColumnsOf = (props: DetailTableProps): Array<TableDetailColumnInput> => {
  const structure = props as Pick<DetailTableProps, 'columns' | 'children'>;
  if (structure.columns !== undefined) {
    if (structure.children !== undefined) {
      throw new Error('table react: DetailTable columns cannot be mixed with DetailColumn children');
    }
    return structure.columns;
  }
  if (structure.children === undefined) {
    throw new Error('table react: DetailTable requires columns or DetailColumn children');
  }
  return buildDetailColumns(structure.children);
};

/** 统一 ManualTable 的 cells props 与 Row marker children authoring */
const manualStructureOf = (props: ManualTableProps): Pick<ManualTableSpecInput, 'cells' | 'rowKinds'> => {
  const structure = props as Pick<ManualTableProps, 'cells' | 'rowKinds' | 'children'>;
  if (structure.children !== undefined) {
    if (structure.cells !== undefined || structure.rowKinds !== undefined) {
      throw new Error('table react: ManualTable Row children cannot be mixed with cells or rowKinds');
    }
    return buildManualStructure(structure.children, props.rows, props.columns);
  }
  if (structure.cells === undefined) {
    throw new Error('table react: ManualTable requires cells or Row children');
  }
  return {
    cells: structure.cells,
    ...(structure.rowKinds === undefined ? {} : { rowKinds: structure.rowKinds }),
  };
};

/** 从 detail React props 提取 framework-neutral authoring 输入 */
const detailSpecOf = (props: DetailTableProps): IRDetailTableSpec => {
  const columns = detailColumnsOf(props);
  return createDetailTableSpec({
    ...(props.id === undefined ? {} : { id: props.id }),
    dataRef: props.dataRef,
    ...(props.model === undefined ? {} : { model: props.model }),
    columns,
    ...(props.header === undefined ? {} : { header: props.header }),
    ...(props.layout === undefined ? {} : { layout: props.layout }),
    ...(props.meta === undefined ? {} : { meta: props.meta }),
  });
};

/** 从 manual React props 提取 framework-neutral authoring 输入 */
const manualSpecOf = (props: ManualTableProps): IRManualTableSpec => {
  const structure = manualStructureOf(props);
  return createManualTableSpec({
    ...(props.id === undefined ? {} : { id: props.id }),
    rows: props.rows,
    columns: props.columns,
    ...structure,
    ...(props.layout === undefined ? {} : { layout: props.layout }),
    ...(props.meta === undefined ? {} : { meta: props.meta }),
  });
};

/** 解析三种 React Table props 为同一 standalone / embedded runtime 输入 */
export const resolveReactTableRuntime = (
  kind: ReactTableRuntimeKindValue,
  props: AnyTableProps,
  options: Readonly<{ embedded?: boolean }> = {},
): ReactTableRuntime => {
  let spec: IRTableSpec;
  let datasets: ExternalDatasets;
  if (kind === ReactTableRuntimeKind.Table) {
    const tableProps = props as TableProps;
    spec = TableSpecSchema.parse(tableProps.spec);
    datasets = tableProps.data ?? {};
  } else if (kind === ReactTableRuntimeKind.Detail) {
    const detailProps = props as DetailTableProps;
    const detailSpec = detailSpecOf(detailProps);
    spec = detailSpec;
    datasets = { [detailSpec.data.reference]: detailProps.data };
  } else {
    const manualProps = props as ManualTableProps;
    spec = manualSpecOf(manualProps);
    datasets = {};
  }

  if (options.embedded) {
    if (spec.id === undefined || spec.id.trim().length === 0) {
      throw new Error(`table react: embedded ${kind} Table spec id must be non-empty`);
    }
    if (props.onManifest !== undefined) {
      throw new Error('table react: embedded onManifest is unsupported; call lowerTableWithArtifacts explicitly');
    }
  }

  return {
    spec,
    datasets,
    lowerOptions: lowerOptionsOf(props),
    composites: props.composites ?? [],
    onManifest: props.onManifest,
    display: displayOf(props),
  };
};
