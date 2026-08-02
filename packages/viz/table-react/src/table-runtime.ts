import type { AnyCompositeDefinition, AssertEqual, ValueOf } from '@retikz/core';
import type { ExternalDatasets, ExternalRow } from '@retikz/data';
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
import type { TableCommonProps, TableLayoutHostProps, TableProps } from './Table';

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

/** Table standalone 入口允许透传给 Layout 的宿主字段 */
export const TABLE_LAYOUT_HOST_PROP_KEYS = [
  'handlers',
  'width',
  'height',
  'viewBox',
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
  'ribbonWidthProfiles',
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
  /** 已通过 Table schema 的根 spec */
  spec: IRTableSpec;
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
const validateHostStyleMigration = (kind: ReactTableRuntimeKindValue, props: AnyTableProps): void => {
  const plainProps = props as AnyTableProps & { style?: unknown };
  if (kind === ReactTableRuntimeKind.Table && Object.hasOwn(plainProps, 'style')) {
    throw new Error(
      'table react: Table top-level style is unsupported; use spec.style for the Table preset and containerStyle for standalone host CSS',
    );
  }
  if (plainProps.style !== null && typeof plainProps.style === 'object') {
    const componentName = kind === ReactTableRuntimeKind.Detail ? 'DetailTable' : 'ManualTable';
    throw new Error(
      `table react: ${componentName} style accepts a Table preset; move standalone host CSS to containerStyle`,
    );
  }
};

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

/** 统一 ManualTable 的 rows props 与 Row marker children authoring */
const manualStructureOf = (props: ManualTableProps): Pick<ManualTableSpecInput, 'rows' | 'rowKinds'> => {
  const structure = props as Pick<ManualTableProps, 'rows' | 'rowKinds' | 'children'>;
  if (structure.children !== undefined) {
    if (structure.rows !== undefined || structure.rowKinds !== undefined) {
      throw new Error('table react: ManualTable Row children cannot be mixed with rows or rowKinds');
    }
    return buildManualStructure(structure.children);
  }
  if (structure.rows === undefined) {
    throw new Error('table react: ManualTable requires rows or Row children');
  }
  return {
    rows: structure.rows,
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
    ...(props.rules === undefined ? {} : { rules: props.rules }),
    ...(props.encodings === undefined ? {} : { encodings: props.encodings }),
    ...(props.style === undefined ? {} : { style: props.style }),
    ...(props.themeMode === undefined ? {} : { themeMode: props.themeMode }),
    ...(props.styleTokens === undefined ? {} : { styleTokens: props.styleTokens }),
  });
};

/** 从 manual React props 提取 framework-neutral authoring 输入 */
const manualSpecOf = (props: ManualTableProps): IRManualTableSpec => {
  const structure = manualStructureOf(props);
  return createManualTableSpec({
    ...(props.id === undefined ? {} : { id: props.id }),
    ...structure,
    ...(props.layout === undefined ? {} : { layout: props.layout }),
    ...(props.meta === undefined ? {} : { meta: props.meta }),
    ...(props.rules === undefined ? {} : { rules: props.rules }),
    ...(props.encodings === undefined ? {} : { encodings: props.encodings }),
    ...(props.style === undefined ? {} : { style: props.style }),
    ...(props.themeMode === undefined ? {} : { themeMode: props.themeMode }),
    ...(props.styleTokens === undefined ? {} : { styleTokens: props.styleTokens }),
  });
};

/** 解析三种 React Table props 为同一 standalone / embedded runtime 输入 */
export const resolveReactTableRuntime = (
  kind: ReactTableRuntimeKindValue,
  props: AnyTableProps,
  options: Readonly<{ embedded?: boolean }> = {},
): ReactTableRuntime => {
  validateHostStyleMigration(kind, props);
  let spec: IRTableSpec;
  let datasets: ExternalDatasets;
  let datasetSource: ExternalDatasets | Array<ExternalRow>;
  let datasetReference: string | undefined;
  if (kind === ReactTableRuntimeKind.Table) {
    const tableProps = props as TableProps;
    spec = TableSpecSchema.parse(tableProps.spec);
    datasets = tableProps.data ?? EMPTY_DATASETS;
    datasetSource = datasets;
  } else if (kind === ReactTableRuntimeKind.Detail) {
    const detailProps = props as DetailTableProps;
    const detailSpec = detailSpecOf(detailProps);
    spec = detailSpec;
    datasets = { [detailSpec.data.reference]: detailProps.data };
    datasetSource = detailProps.data;
    datasetReference = detailSpec.data.reference;
  } else {
    const manualProps = props as ManualTableProps;
    spec = manualSpecOf(manualProps);
    datasets = EMPTY_DATASETS;
    datasetSource = EMPTY_DATASETS;
  }

  if (options.embedded) {
    if (spec.id === undefined || spec.id.trim().length === 0) {
      throw new Error(`table react: embedded ${kind} Table spec id must be non-empty`);
    }
    const unsupportedProps = unsupportedEmbeddedPropsOf(props);
    if (unsupportedProps.length > 0) {
      throw new Error(
        `table react: embedded Table does not support standalone props: ${unsupportedProps.join(', ')}; move them to the outer <Layout>`,
      );
    }
  }

  return {
    spec,
    datasets,
    datasetSource,
    ...(datasetReference === undefined ? {} : { datasetReference }),
    lowerOptions: lowerOptionsOf(props),
    composites: props.composites ?? EMPTY_COMPOSITES,
    onManifest: props.onManifest,
    display: hostPropsOf(props),
  };
};
