import type { AnyCompositeDefinition } from '@retikz/core';
import type { ExternalDatasets, ExternalRow } from '@retikz/data';
import type { AssertEqual, ValueOf } from '@retikz/foundation';
import type { LayoutProps } from '@retikz/react';
import type { LowerTablesOptions, ManualTableInput, TableDetailColumnInput, TableLayoutManifest } from '@retikz/table';
import type { InputDetailTable, InputManualTable, InputTable, InputTableVariant } from '@retikz/table-vanilla';

import { assertNonEmptyString } from '@retikz/foundation';
import { inputTableFromIR, InputTableKind } from '@retikz/table-vanilla';

import type { DetailTableProps } from './DetailTable';
import type { ManualTableProps } from './ManualTable';
import type { TableCommonProps, TableLayoutHostProps, TableProps } from './Table';

import { buildDetailColumns } from './components/build-detail-columns';
import { buildManualStructure } from './components/build-manual-structure';
import { RetikzTableReactError } from './error';

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
export type ReactTableRuntimeKindValue = ValueOf<typeof ReactTableRuntimeKind>;

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

type AnyTableProps = TableProps | DetailTableProps | ManualTableProps;

/** 从共享 props 提取 Table lowering options */
const lowerOptionsOf = (props: TableCommonProps): LowerTablesOptions => ({
  structureDefinitions: props.structureDefinitions,
  formatterDefinitions: props.formatterDefinitions,
  presentationDefinitions: props.presentationDefinitions,
  visualScaleDefinitions: props.visualScaleDefinitions,
  tableThemeStyles: props.tableThemeStyles,
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

/** 在 schema 解析前报告 React 宿主 style 迁移错误 */
const validateHostStyleMigration = (props: AnyTableProps): void => {
  const plainProps = props as AnyTableProps & {
    style?: unknown;
    themeMode?: unknown;
    styleTokens?: unknown;
  };
  if (Object.hasOwn(plainProps, 'style')) {
    throw new RetikzTableReactError(
      'table react: top-level style is unsupported; use containerStyle for host CSS and theme for Core Theme',
    );
  }
  if (Object.hasOwn(plainProps, 'themeMode')) {
    throw new RetikzTableReactError('table react: top-level themeMode is unsupported; use theme.mode for Core Theme');
  }
  if (Object.hasOwn(plainProps, 'styleTokens')) {
    throw new RetikzTableReactError(
      'table react: top-level styleTokens is unsupported; use tableThemeTokens for Table tokens',
    );
  }
};

/** 统一 DetailTable 的 columns props 与 marker children authoring */
const detailColumnsOf = (props: DetailTableProps): Array<TableDetailColumnInput> => {
  const structure = props as Pick<DetailTableProps, 'columns' | 'children'>;
  if (structure.columns !== undefined) {
    if (structure.children !== undefined) {
      throw new RetikzTableReactError('table react: DetailTable columns cannot be mixed with DetailColumn children');
    }
    return structure.columns;
  }
  if (structure.children === undefined) {
    throw new RetikzTableReactError('table react: DetailTable requires columns or DetailColumn children');
  }
  return buildDetailColumns(structure.children);
};

/** 统一 ManualTable 的 rows props 与 Row marker children authoring */
const manualStructureOf = (props: ManualTableProps): Pick<ManualTableInput, 'rows' | 'rowKinds'> => {
  const structure = props as Pick<ManualTableProps, 'rows' | 'rowKinds' | 'children'>;
  if (structure.children !== undefined) {
    if (structure.rows !== undefined || structure.rowKinds !== undefined) {
      throw new RetikzTableReactError('table react: ManualTable Row children cannot be mixed with rows or rowKinds');
    }
    return buildManualStructure(structure.children);
  }
  if (structure.rows === undefined) {
    throw new RetikzTableReactError('table react: ManualTable requires rows or Row children');
  }
  return {
    rows: structure.rows,
    ...(structure.rowKinds === undefined ? {} : { rowKinds: structure.rowKinds }),
  };
};

/** 从 detail React props 提取 framework-neutral authoring 输入 */
const detailTableOf = (props: DetailTableProps): InputDetailTable => {
  const columns = detailColumnsOf(props);
  return {
    kind: InputTableKind.Detail,
    input: {
      ...(props.id === undefined ? {} : { id: props.id }),
      dataRef: props.dataRef,
      ...(props.model === undefined ? {} : { model: props.model }),
      columns,
      ...(props.header === undefined ? {} : { header: props.header }),
      ...(props.layout === undefined ? {} : { layout: props.layout }),
      ...(props.meta === undefined ? {} : { meta: props.meta }),
      ...(props.rules === undefined ? {} : { rules: props.rules }),
      ...(props.encodings === undefined ? {} : { encodings: props.encodings }),
      ...(props.tableThemeTokens === undefined ? {} : { tableThemeTokens: props.tableThemeTokens }),
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
      ...(props.tableThemeTokens === undefined ? {} : { tableThemeTokens: props.tableThemeTokens }),
    },
  };
};

/** 解析三种 React Table props 为同一 standalone / embedded runtime 输入 */
export const resolveReactTableRuntime = (
  kind: ReactTableRuntimeKindValue,
  props: AnyTableProps,
  options: Readonly<{ embedded?: boolean }> = {},
): ReactTableRuntime => {
  validateHostStyleMigration(props);
  let table: InputTableVariant;
  let datasets: ExternalDatasets;
  let datasetSource: ExternalDatasets | Array<ExternalRow>;
  let datasetReference: string | undefined;
  if (kind === ReactTableRuntimeKind.Table) {
    const tableProps = props as TableProps;
    table = inputTableFromIR(tableProps.spec);
    datasets = tableProps.data ?? EMPTY_DATASETS;
    datasetSource = datasets;
  } else if (kind === ReactTableRuntimeKind.Detail) {
    const detailProps = props as DetailTableProps;
    const detailTable = detailTableOf(detailProps);
    table = detailTable;
    datasets = { [detailTable.input.dataRef]: detailProps.data };
    datasetSource = detailProps.data;
    datasetReference = detailTable.input.dataRef;
  } else {
    const manualProps = props as ManualTableProps;
    table = manualTableOf(manualProps);
    datasets = EMPTY_DATASETS;
    datasetSource = EMPTY_DATASETS;
  }

  if (options.embedded) {
    if (table.input.id === undefined)
      throw new RetikzTableReactError(`table react: embedded ${kind} Table spec id must be non-empty`);
    assertNonEmptyString(table.input.id, `table react embedded ${kind} Table spec id`);
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
    datasetSource,
    ...(datasetReference === undefined ? {} : { datasetReference }),
    lowerOptions: lowerOptionsOf(props),
    composites: props.composites ?? EMPTY_COMPOSITES,
    onManifest: props.onManifest,
    display: hostPropsOf(props),
  };
};

/** 将 React Table props 转换为唯一的 Table Vanilla 输入 */
export const createReactTableInput = (kind: ReactTableRuntimeKindValue, props: AnyTableProps): InputTable => {
  const runtime = resolveReactTableRuntime(kind, props, { embedded: true });
  return {
    table: runtime.table,
    data: runtime.datasets,
    lowerOptions: runtime.lowerOptions,
    composites: runtime.composites,
    preserveRootIdentity: true,
  };
};
