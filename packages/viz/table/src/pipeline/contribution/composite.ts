import type { AnyCompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import {
  extractRegressionKind,
  extractStatisticOperation,
  extractTransformKind,
  mergeExternalDatasets,
} from '@retikz/data';

import type {
  AnyCellFormatterDefinition,
  AnyCellPresentationDefinition,
  AnyCellVisualScaleDefinition,
  AnyTableStructureDefinition,
  TableThemeDefinition,
} from '../../contract';
import { RetikzTableError } from '../../error';
import { extractTableStructureKind } from '../../providers';
import { TABLE_NAMESPACE, TableComposite } from '../../schemas';
import { lowerTables } from '../resolve';
import type { TablesLoweringOptions } from '../types';

const STRUCTURE_DEFINITIONS_KEY = 'structureDefinitions';

const FORMATTER_DEFINITIONS_KEY = 'formatterDefinitions';

const PRESENTATION_DEFINITIONS_KEY = 'presentationDefinitions';

const VISUAL_SCALE_DEFINITIONS_KEY = 'visualScaleDefinitions';

const TABLE_THEME_STYLES_KEY = 'tableThemeDefinitions';

const DATA_OPTIONS_KEYS = new Set([
  'formatDefinitions',
  'fieldOrderDefinitions',
  'transformDefinitions',
  'statisticsReducerDefinitions',
  'rowSelectorDefinitions',
  'regressionDefinitions',
  'transformImplementations',
  'statisticsReducerImplementations',
  'rowSelectorImplementations',
  'regressionImplementations',
]);

/** Table 提供者的运行时参数 */
export type TableProviderParams = Readonly<{
  /** 按引用名索引的行数据集 */
  datasets: ExternalDatasets;
  /** Table 编译选项 */
  lowerOptions: TablesLoweringOptions;
}>;

/** Table Composite provider 的公开完整 key */
export const tableProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: TABLE_NAMESPACE,
  type: TableComposite.Table,
});

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
        throw new RetikzTableError(`table: runtime contribution ${label} conflict for "${key}"`);
      }

      if (current === undefined) merged.set(key, value);
    }
  }

  return [...merged.values()];
};

/** 合并当前与未来的非 definition lowering options */
const mergeSharedLowerOptions = (optionSets: ReadonlyArray<TablesLoweringOptions>): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};

  for (const options of optionSets) {
    for (const [key, value] of Object.entries(options as Record<string, unknown>)) {
      if (
        value === undefined ||
        key === STRUCTURE_DEFINITIONS_KEY ||
        key === FORMATTER_DEFINITIONS_KEY ||
        key === PRESENTATION_DEFINITIONS_KEY ||
        key === VISUAL_SCALE_DEFINITIONS_KEY ||
        key === TABLE_THEME_STYLES_KEY ||
        DATA_OPTIONS_KEYS.has(key)
      )
        continue;

      if (Object.hasOwn(merged, key) && !Object.is(merged[key], value)) {
        throw new RetikzTableError(`table: runtime contribution lower option "${key}" conflict`);
      }

      merged[key] = value;
    }
  }

  return merged;
};

/** 合并多个 Table 贡献的编译选项 */
const mergeLowerOptions = (optionSets: ReadonlyArray<TablesLoweringOptions>): TablesLoweringOptions => {
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
  const tableThemeDefinitions = mergeByIdentity<TableThemeDefinition>(
    optionSets.map(options => options.tableThemeDefinitions),
    definition => definition.name,
    'theme definition',
  );

  return {
    ...mergeSharedLowerOptions(optionSets),
    fieldOrderDefinitions: mergeByIdentity(
      optionSets.map(options => options.fieldOrderDefinitions),
      definition => definition.name,
      'field order',
    ),
    formatDefinitions: mergeByIdentity(
      optionSets.map(options => options.formatDefinitions),
      definition => definition.name,
      'field format',
    ),
    transformDefinitions: mergeByIdentity(
      optionSets.map(options => options.transformDefinitions),
      definition => extractTransformKind(definition.schema),
      'transform definition',
    ),
    statisticsReducerDefinitions: mergeByIdentity(
      optionSets.map(options => options.statisticsReducerDefinitions),
      definition => extractStatisticOperation(definition.schema),
      'reducer definition',
    ),
    rowSelectorDefinitions: mergeByIdentity(
      optionSets.map(options => options.rowSelectorDefinitions),
      definition => extractStatisticOperation(definition.schema),
      'selector definition',
    ),
    regressionDefinitions: mergeByIdentity(
      optionSets.map(options => options.regressionDefinitions),
      definition => extractRegressionKind(definition.schema),
      'regression definition',
    ),
    transformImplementations: mergeByIdentity(
      optionSets.map(options => options.transformImplementations),
      implementation => extractTransformKind(implementation.definition.schema),
      'transform implementation',
    ),
    statisticsReducerImplementations: mergeByIdentity(
      optionSets.map(options => options.statisticsReducerImplementations),
      implementation => extractStatisticOperation(implementation.definition.schema),
      'reducer implementation',
    ),
    rowSelectorImplementations: mergeByIdentity(
      optionSets.map(options => options.rowSelectorImplementations),
      implementation => extractStatisticOperation(implementation.definition.schema),
      'selector implementation',
    ),
    regressionImplementations: mergeByIdentity(
      optionSets.map(options => options.regressionImplementations),
      implementation => extractRegressionKind(implementation.definition.schema),
      'regression implementation',
    ),
    ...(structureDefinitions.length === 0 ? {} : { structureDefinitions }),
    ...(formatterDefinitions.length === 0 ? {} : { formatterDefinitions }),
    ...(presentationDefinitions.length === 0 ? {} : { presentationDefinitions }),
    ...(visualScaleDefinitions.length === 0 ? {} : { visualScaleDefinitions }),
    ...(tableThemeDefinitions.length === 0 ? {} : { tableThemeDefinitions }),
  };
};

/** 合并 Table 所属数据集与编译选项并物化唯一定义 */
const makeTableDefinition: CoreDependencyProvider<TableProviderParams>['makeDefinition'] = contributions =>
  lowerTables(
    mergeExternalDatasets(contributions.map(params => params.datasets)),
    mergeLowerOptions(contributions.map(params => params.lowerOptions)),
  )[0];

/** 同键嵌套提供者只接受同一定义引用 */
const makeNestedDefinition: CoreDependencyProvider<AnyCompositeDefinition>['makeDefinition'] = definitions => {
  const definition = definitions[0];
  if (definitions.some(candidate => candidate !== definition)) {
    throw new RetikzTableError(`table: nested definition conflict for "${definition.namespace}.${definition.type}"`);
  }
  return definition;
};

/** 创建携带具名参数的 Table 提供者 */
export const createTableProvider = (
  data: ExternalDatasets,
  lowerOptions: TablesLoweringOptions,
): CoreDependencyProvider<TableProviderParams> =>
  Object.freeze({
    key: tableProviderKey,
    params: Object.freeze({ datasets: Object.freeze({ ...data }), lowerOptions }),
    makeDefinition: makeTableDefinition,
  });

/** 以参数直接携带 Cell 内嵌的复合定义 */
export const createTableNestedDefinitionProvider = (
  definition: AnyCompositeDefinition,
): CoreDependencyProvider<AnyCompositeDefinition> =>
  Object.freeze({
    key: Object.freeze({ capability: 'composite', namespace: definition.namespace, type: definition.type }),
    params: definition,
    makeDefinition: makeNestedDefinition,
  });
