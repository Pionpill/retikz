import type { AnyCompositeDefinition } from '@retikz/core';
import type { ExternalDatasets, ExternalRow, DataInputBindings, DataTransformExecutor } from '@retikz/data';
import type { AssertEqual, ValueOf } from '@retikz/foundation';
import type { LayoutProps } from '@retikz/react';
import type { LowerTablesOptions, ManualTableInput, TableDetailColumnInput, TableLayoutManifest } from '@retikz/table';
import type { InputDetailTable, InputManualTable, InputTable, InputTableVariant } from '@retikz/table-vanilla';
import { inputTableFromIR, InputTableKind } from '@retikz/table-vanilla';

import { buildDetailColumns } from './components/build-detail-columns';
import { buildManualStructure } from './components/build-manual-structure';
import type { DetailTableProps } from './DetailTable';
import { RetikzTableReactError } from './error';
import type { ManualTableProps } from './ManualTable';
import type { TableCommonProps, TableLayoutHostProps, TableProps } from './Table';

/** React Table runtime 的入口类型 */
export const ReactTableRuntimeKind = {
  /** 通用 IRTable 入口 */
  Table: 'table',
  /** detail authoring 入口 */
  Detail: 'detail',
  /** manual authoring 入口 */
  Manual: 'manual',
} as const;

/** React Table runtime 入口类型取值 */
export type ReactTableRuntimeKind = ValueOf<typeof ReactTableRuntimeKind>;

/** Table standalone 入口允许透传给 Layout 的宿主字段 */
export const TABLE_LAYOUT_HOST_PROP_KEYS = [
  'handlers',
  'width',
  'height',
  'viewBox',
  'theme',
  'themeStyles',
  'className',
  'containerStyle',
  'renderer',
  'animate',
  'snapshotAt',
  'animationRef',
  'animations',
  'easings',
  'animationProperties',
  'idPrefix',
  'nodeDistance',
  'fontSize',
  'shapes',
  'boundaries',
  'clips',
  'arrows',
  'patterns',
  'pathGenerators',
  'pathKinds',
  'lowerTex',
] as const satisfies ReadonlyArray<keyof TableLayoutHostProps>;

type _TableLayoutHostPropKeysCheck = AssertEqual<
  (typeof TABLE_LAYOUT_HOST_PROP_KEYS)[number],
  keyof TableLayoutHostProps
>;
const _assertTableLayoutHostPropKeys: _TableLayoutHostPropKeysCheck = true;
void _assertTableLayoutHostPropKeys;

const EMPTY_COMPOSITES: ReadonlyArray<AnyCompositeDefinition> = Object.freeze([]);
const EMPTY_DATASETS: ExternalDatasets = Object.freeze({});

/** 三个 React Table 组件共享的规范化运行时输入 */
export type ReactTableRuntime = Readonly<{
  /** 尚待 Table Vanilla 归一化的根 authoring 输入 */
  table: InputTableVariant;
  /** Table lowering 消费的外部 datasets */
  datasets: ExternalDatasets;
  /** 规范结果或原生源绑定 */
  dataBindings?: DataInputBindings<unknown>;
  /** 本次请求执行器 */
  dataTransformExecutor?: DataTransformExecutor<unknown>;
  /** 本次请求取消信号 */
  signal?: AbortSignal;
  /** 保留原始引用的 dataset 输入，用于 standalone compile memo */
  datasetSource: ExternalDatasets | Array<ExternalRow>;
  /** detail datasetSource 对应的 runtime reference */
  datasetReference?: string;
  /** Table definitions 与其它 lowering 选项 */
  lowerOptions: LowerTablesOptions;
  /** Cell 内嵌 Tier 2 内容所需的额外 composites */
  composites: ReadonlyArray<AnyCompositeDefinition>;
  /** standalone 模式的 manifest observer */
  onManifest?: (manifest: TableLayoutManifest) => void;
  /** 透传给 Layout 的选定宿主 props */
  display: Omit<TableLayoutHostProps, 'containerStyle'> & Pick<LayoutProps, 'style'>;
}>;

type AnyTableProps = TableProps<unknown> | DetailTableProps<unknown> | ManualTableProps;

/** 从共享 props 提取 Table lowering options */
const lowerOptionsOf = (props: TableCommonProps): LowerTablesOptions => ({
  structureDefinitions: props.structureDefinitions,
  formatterDefinitions: props.formatterDefinitions,
  presentationDefinitions: props.presentationDefinitions,
  visualScaleDefinitions: props.visualScaleDefinitions,
  tableThemeStyles: props.tableThemeStyles,
  formatDefinitions: props.formatDefinitions,
  transformDefinitions: props.transformDefinitions,
  statisticsReducerDefinitions: props.statisticsReducerDefinitions,
  rowSelectorDefinitions: props.rowSelectorDefinitions,
  regressionDefinitions: props.regressionDefinitions,
  transformImplementations: props.transformImplementations,
  statisticsReducerImplementations: props.statisticsReducerImplementations,
  rowSelectorImplementations: props.rowSelectorImplementations,
  regressionImplementations: props.regressionImplementations,
});

/** 从共享 props 精确提取 React Layout 宿主选项 */
const hostPropsOf = (props: TableCommonProps): ReactTableRuntime['display'] =>
  Object.fromEntries(
    TABLE_LAYOUT_HOST_PROP_KEYS.flatMap(key => {
      const value = props[key];
      if (value === undefined) return [];
      return [[key === 'containerStyle' ? 'style' : key, value]];
    }),
  );

/** 收集 embedded Table 不支持的 standalone-only props */
const unsupportedEmbeddedPropsOf = (props: TableCommonProps): Array<string> => {
  const unsupported: Array<string> = TABLE_LAYOUT_HOST_PROP_KEYS.filter(key => Object.hasOwn(props, key));
  if (Object.hasOwn(props, 'onManifest')) unsupported.push('onManifest');
  const plainProps = props as TableCommonProps & { embeddables?: unknown };
  if (Object.hasOwn(plainProps, 'embeddables')) unsupported.push('embeddables');
  return unsupported;
};

/** 统一 DetailTable 的 columns props 与 marker children authoring */
const detailColumnsOf = (props: DetailTableProps<unknown>): Array<TableDetailColumnInput> => {
  if (props.columns !== undefined) return props.columns;
  return buildDetailColumns(props.children);
};

/** 统一 ManualTable 的 rows props 与 Row marker children authoring */
const manualStructureOf = (props: ManualTableProps): Pick<ManualTableInput, 'rows' | 'rowKinds'> => {
  if (props.rows === undefined) return buildManualStructure(props.children);
  return {
    rows: props.rows,
    ...(props.rowKinds === undefined ? {} : { rowKinds: props.rowKinds }),
  };
};

/** 从 detail React props 提取 framework-neutral authoring 输入 */
const detailTableOf = (props: DetailTableProps<unknown>): InputDetailTable => {
  const columns = detailColumnsOf(props);
  return {
    kind: InputTableKind.Detail,
    input: {
      ...(props.id === undefined ? {} : { id: props.id }),
      dataRef: props.dataRef,
      ...(props.model === undefined ? {} : { model: props.model }),
      ...(props.transform === undefined ? {} : { transform: props.transform }),
      ...(props.dataExecution === undefined ? {} : { dataExecution: props.dataExecution }),
      columns,
      ...(props.header === undefined ? {} : { header: props.header }),
      ...(props.layout === undefined ? {} : { layout: props.layout }),
      ...(props.meta === undefined ? {} : { meta: props.meta }),
      ...(props.rules === undefined ? {} : { rules: props.rules }),
      ...(props.encodings === undefined ? {} : { encodings: props.encodings }),
      ...(props.appearanceDefaults === undefined ? {} : { appearanceDefaults: props.appearanceDefaults }),
      ...(props.visualDefaults === undefined ? {} : { visualDefaults: props.visualDefaults }),
      ...(props.tableDefaults === undefined ? {} : { tableDefaults: props.tableDefaults }),
    },
  };
};

/** 从 manual React props 提取 framework-neutral authoring 输入 */
const manualTableOf = (props: ManualTableProps): InputManualTable => {
  const structure = manualStructureOf(props);
  return {
    kind: InputTableKind.Manual,
    input: {
      ...(props.id === undefined ? {} : { id: props.id }),
      ...structure,
      ...(props.layout === undefined ? {} : { layout: props.layout }),
      ...(props.meta === undefined ? {} : { meta: props.meta }),
      ...(props.rules === undefined ? {} : { rules: props.rules }),
      ...(props.encodings === undefined ? {} : { encodings: props.encodings }),
      ...(props.appearanceDefaults === undefined ? {} : { appearanceDefaults: props.appearanceDefaults }),
      ...(props.visualDefaults === undefined ? {} : { visualDefaults: props.visualDefaults }),
      ...(props.tableDefaults === undefined ? {} : { tableDefaults: props.tableDefaults }),
    },
  };
};

/** 解析三种 React Table props 为同一 standalone / embedded runtime 输入 */
export const resolveReactTableRuntime = (
  kind: ReactTableRuntimeKind,
  props: AnyTableProps,
  options: Readonly<{ embedded?: boolean }> = {},
): ReactTableRuntime => {
  let table: InputTableVariant;
  let datasets: ExternalDatasets;
  let datasetSource: ExternalDatasets | Array<ExternalRow>;
  let datasetReference: string | undefined;
  let dataBindings: DataInputBindings<unknown> | undefined;
  let dataTransformExecutor: DataTransformExecutor<unknown> | undefined;
  let signal: AbortSignal | undefined;
  if (kind === ReactTableRuntimeKind.Table) {
    const tableProps = props as TableProps<unknown>;
    if (tableProps.dataExecution !== undefined && tableProps.spec.dataExecution !== undefined)
      throw new RetikzTableReactError('Table dataExecution cannot be supplied in both spec and root props');
    table = inputTableFromIR(tableProps.spec);
    if (tableProps.dataExecution !== undefined) {
      if (table.kind === InputTableKind.Manual)
        throw new RetikzTableReactError('Manual Table does not accept dataExecution');
      table =
        table.kind === InputTableKind.Detail
          ? { kind: InputTableKind.Detail, input: { ...table.input, dataExecution: tableProps.dataExecution } }
          : { kind: InputTableKind.Custom, input: { ...table.input, dataExecution: tableProps.dataExecution } };
    }
    datasets = tableProps.data ?? EMPTY_DATASETS;
    datasetSource = datasets;
    dataBindings = tableProps.dataBindings;
    dataTransformExecutor = tableProps.dataTransformExecutor;
    signal = tableProps.signal;
  } else if (kind === ReactTableRuntimeKind.Detail) {
    const detailProps = props as DetailTableProps<unknown>;
    const detailTable = detailTableOf(detailProps);
    table = detailTable;
    datasets = detailProps.data === undefined ? EMPTY_DATASETS : { [detailTable.input.dataRef]: detailProps.data };
    datasetSource = detailProps.data ?? EMPTY_DATASETS;
    datasetReference = detailTable.input.dataRef;
    dataBindings = detailProps.dataBindings;
    dataTransformExecutor = detailProps.dataTransformExecutor;
    signal = detailProps.signal;
  } else {
    const manualProps = props as ManualTableProps;
    table = manualTableOf(manualProps);
    datasets = EMPTY_DATASETS;
    datasetSource = EMPTY_DATASETS;
  }

  if (options.embedded) {
    const unsupportedProps = unsupportedEmbeddedPropsOf(props);
    if (unsupportedProps.length > 0) {
      throw new RetikzTableReactError(
        `table react: embedded Table does not support standalone props: ${unsupportedProps.join(', ')}; move them to the outer <Layout>`,
      );
    }
  }

  return {
    table,
    datasets,
    dataBindings,
    dataTransformExecutor,
    signal,
    datasetSource,
    ...(datasetReference === undefined ? {} : { datasetReference }),
    lowerOptions: lowerOptionsOf(props),
    composites: props.composites ?? EMPTY_COMPOSITES,
    onManifest: props.onManifest,
    display: hostPropsOf(props),
  };
};

/** 将 React Table props 转换为唯一的 Table Vanilla 输入 */
export const createReactTableInput = (kind: ReactTableRuntimeKind, props: AnyTableProps): InputTable<unknown> => {
  const runtime = resolveReactTableRuntime(kind, props, { embedded: true });
  return {
    table: runtime.table,
    ...(runtime.dataBindings === undefined ? { data: runtime.datasets } : { dataBindings: runtime.dataBindings }),
    dataTransformExecutor: runtime.dataTransformExecutor,
    signal: runtime.signal,
    lowerOptions: runtime.lowerOptions,
    composites: runtime.composites,
  };
};
