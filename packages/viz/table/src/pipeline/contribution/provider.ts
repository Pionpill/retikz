import type { AnyCompositeDefinition, CompositeDependencyProvider, CompositeProviderKey } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import type {
  AnyCellFormatterDefinition,
  AnyCellPresentationDefinition,
  AnyCellVisualScaleDefinition,
  AnyTableStructureDefinition,
  TableThemeStyleDefinition,
} from '../../contract';
import type { LowerTablesOptions } from '../types';

import { extractTableStructureKind } from '../../providers';
import { TABLE_NAMESPACE, TableComposite } from '../../schemas';
import { lowerTables } from '../resolve';

const TableRuntimeEnvelopeMarker = Symbol('retikz.table.runtimeEnvelope');
const STRUCTURE_DEFINITIONS_KEY = 'structureDefinitions';
const FORMATTER_DEFINITIONS_KEY = 'formatterDefinitions';
const PRESENTATION_DEFINITIONS_KEY = 'presentationDefinitions';
const VISUAL_SCALE_DEFINITIONS_KEY = 'visualScaleDefinitions';
const TABLE_THEME_STYLES_KEY = 'tableThemeStyles';
const NestedDefinitionReference = '@@retikz/table/nested-definition';

/** Table runtime-only envelope；只在宿主聚合阶段存在 */
type TableRuntimeEnvelope = Readonly<{
  [TableRuntimeEnvelopeMarker]: true;
  lowerOptions: LowerTablesOptions;
}>;

/** Table Composite provider 的公开完整 key */
export const TableProviderKey: CompositeProviderKey = Object.freeze({
  namespace: TABLE_NAMESPACE,
  type: TableComposite.Table,
});

/** 判断聚合值是否为本模块创建的 runtime envelope */
const runtimeEnvelopeOf = (value: unknown): TableRuntimeEnvelope | undefined => {
  if (value === null || typeof value !== 'object') return undefined;
  const envelope = value as Partial<TableRuntimeEnvelope>;
  return envelope[TableRuntimeEnvelopeMarker] === true ? (envelope as TableRuntimeEnvelope) : undefined;
};

/** 按稳定 key 合并对象列表；同 key 只接受同一对象引用 */
const mergeByIdentity = <T>(
  values: ReadonlyArray<ReadonlyArray<T> | undefined>,
  keyOf: (value: T) => string,
  label: string,
): Array<T> => {
  const merged = new Map<string, T>();
  for (const entries of values) {
    for (const value of entries ?? []) {
      const key = keyOf(value);
      const current = merged.get(key);
      if (current !== undefined && !Object.is(current, value)) {
        throw new Error(`table: runtime contribution ${label} conflict for "${key}"`);
      }
      if (current === undefined) merged.set(key, value);
    }
  }
  return [...merged.values()];
};

/** 合并当前与未来的非 definition lowering options */
const mergeSharedLowerOptions = (optionSets: ReadonlyArray<LowerTablesOptions>): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};
  for (const options of optionSets) {
    for (const [key, value] of Object.entries(options as Record<string, unknown>)) {
      if (
        value === undefined ||
        key === STRUCTURE_DEFINITIONS_KEY ||
        key === FORMATTER_DEFINITIONS_KEY ||
        key === PRESENTATION_DEFINITIONS_KEY ||
        key === VISUAL_SCALE_DEFINITIONS_KEY ||
        key === TABLE_THEME_STYLES_KEY
      )
        continue;
      if (Object.hasOwn(merged, key) && !Object.is(merged[key], value)) {
        throw new Error(`table: runtime contribution lower option "${key}" conflict`);
      }
      merged[key] = value;
    }
  }
  return merged;
};

/** 合并多个 Table envelope 的 lowering options */
const mergeLowerOptions = (envelopes: ReadonlyArray<TableRuntimeEnvelope>): LowerTablesOptions => {
  const optionSets = envelopes.map(envelope => envelope.lowerOptions);
  const structureDefinitions = mergeByIdentity<AnyTableStructureDefinition>(
    optionSets.map(options => options.structureDefinitions),
    extractTableStructureKind,
    'structure definition',
  );
  const presentationDefinitions = mergeByIdentity<AnyCellPresentationDefinition>(
    optionSets.map(options => options.presentationDefinitions),
    definition => definition.name,
    'presentation definition',
  );
  const formatterDefinitions = mergeByIdentity<AnyCellFormatterDefinition>(
    optionSets.map(options => options.formatterDefinitions),
    definition => definition.name,
    'formatter definition',
  );
  const visualScaleDefinitions = mergeByIdentity<AnyCellVisualScaleDefinition>(
    optionSets.map(options => options.visualScaleDefinitions),
    definition => definition.name,
    'visual scale definition',
  );
  const tableThemeStyles = mergeByIdentity<TableThemeStyleDefinition>(
    optionSets.map(options => options.tableThemeStyles),
    definition => definition.name,
    'theme style definition',
  );
  return {
    ...mergeSharedLowerOptions(optionSets),
    ...(structureDefinitions.length === 0 ? {} : { structureDefinitions }),
    ...(formatterDefinitions.length === 0 ? {} : { formatterDefinitions }),
    ...(presentationDefinitions.length === 0 ? {} : { presentationDefinitions }),
    ...(visualScaleDefinitions.length === 0 ? {} : { visualScaleDefinitions }),
    ...(tableThemeStyles.length === 0 ? {} : { tableThemeStyles }),
  };
};

/** 聚合 Table runtime envelopes 并生成唯一 table.table definition */
const makeTableDefinition: CompositeDependencyProvider['makeDefinition'] = mergedDatasets => {
  const envelopes: Array<TableRuntimeEnvelope> = [];
  const datasetEntries: Array<[string, unknown]> = [];
  for (const [reference, value] of Object.entries(mergedDatasets)) {
    const envelope = runtimeEnvelopeOf(value);
    if (envelope === undefined) datasetEntries.push([reference, value]);
    else envelopes.push(envelope);
  }

  const datasets = Object.fromEntries(datasetEntries) as ExternalDatasets;
  return lowerTables(datasets, mergeLowerOptions(envelopes))[0];
};

/** 从 reserved provider-local dataset entry 返回 exact nested definition */
const makeNestedDefinition: CompositeDependencyProvider['makeDefinition'] = datasets =>
  datasets[NestedDefinitionReference] as AnyCompositeDefinition;

/** 创建只生成 table.table 的稳定 runtime provider */
export const createTableProvider = (
  data: ExternalDatasets,
  runtimeReference: string,
  lowerOptions: LowerTablesOptions,
): CompositeDependencyProvider => {
  const envelope: TableRuntimeEnvelope = Object.freeze({
    [TableRuntimeEnvelopeMarker]: true,
    lowerOptions,
  });
  return Object.freeze({
    key: TableProviderKey,
    dependencies: Object.freeze([]),
    datasets: Object.freeze(Object.fromEntries([...Object.entries(data), [runtimeReference, envelope]])),
    makeDefinition: makeTableDefinition,
  });
};

/** 把一个 Cell nested definition 转成 exact-key provider */
export const createTableNestedDefinitionProvider = (definition: AnyCompositeDefinition): CompositeDependencyProvider =>
  Object.freeze({
    key: Object.freeze({ namespace: definition.namespace, type: definition.type }),
    dependencies: Object.freeze([]),
    datasets: Object.freeze({ [NestedDefinitionReference]: definition }),
    makeDefinition: makeNestedDefinition,
  });
