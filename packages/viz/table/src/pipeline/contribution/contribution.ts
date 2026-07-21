import type { CompositeDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import type { AnyCellPresentationDefinition, AnyTableStructureDefinition } from '../../contract';
import type { LowerTablesOptions } from '../types';
import type { TableRuntimeContribution, TableRuntimeContributionInput } from './types';

import { extractTableStructureKind } from '../../providers';
import { lowerTables } from '../resolve';

const TableRuntimeEnvelopeMarker = Symbol('retikz.table.runtimeEnvelope');
const STRUCTURE_DEFINITIONS_KEY = 'structureDefinitions';
const PRESENTATION_DEFINITIONS_KEY = 'presentationDefinitions';

/** 把任意 JSON 字符串编码为稳定且无碰撞的 runtime reference 片段 */
const encodeRuntimeReference = (reference: string): string =>
  Array.from(reference, character => {
    const codeUnit = character.charCodeAt(0);
    const isLoneSurrogate = character.length === 1 && codeUnit >= 0xd800 && codeUnit <= 0xdfff;
    return isLoneSurrogate
      ? `%u${codeUnit.toString(16).padStart(4, '0').toUpperCase()}`
      : encodeURIComponent(character);
  }).join('');

/** Table runtime-only envelope；只在宿主聚合阶段存在 */
type TableRuntimeEnvelope = Readonly<{
  [TableRuntimeEnvelopeMarker]: true;
  lowerOptions: LowerTablesOptions;
  composites: ReadonlyArray<CompositeDefinition>;
}>;

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
      if (value === undefined || key === STRUCTURE_DEFINITIONS_KEY || key === PRESENTATION_DEFINITIONS_KEY) continue;
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
  return {
    ...mergeSharedLowerOptions(optionSets),
    ...(structureDefinitions.length === 0 ? {} : { structureDefinitions }),
    ...(presentationDefinitions.length === 0 ? {} : { presentationDefinitions }),
  };
};

/** 按 namespace/type 合并额外 composites */
const mergeExtraComposites = (envelopes: ReadonlyArray<TableRuntimeEnvelope>): Array<CompositeDefinition> =>
  mergeByIdentity(
    envelopes.map(envelope => envelope.composites),
    definition => `${definition.namespace}.${definition.type}`,
    'composite',
  );

/**
 * 聚合 Table runtime envelopes 并生成 Table 与额外 composite definitions
 * @description 该函数引用稳定，供同一宿主内的多个 Table contribution 共享
 */
export const makeTableRuntimeComposites = (mergedDatasets: Record<string, unknown>): Array<CompositeDefinition> => {
  const envelopes: Array<TableRuntimeEnvelope> = [];
  const datasetEntries: Array<[string, unknown]> = [];
  for (const [reference, value] of Object.entries(mergedDatasets)) {
    const envelope = runtimeEnvelopeOf(value);
    if (envelope === undefined) datasetEntries.push([reference, value]);
    else envelopes.push(envelope);
  }

  const datasets = Object.fromEntries(datasetEntries) as ExternalDatasets;
  return [...lowerTables(datasets, mergeLowerOptions(envelopes)), ...mergeExtraComposites(envelopes)];
};

/** 创建供 React 与 Vanilla 宿主统一聚合的 Table runtime contribution */
export const createTableRuntimeContribution = (input: TableRuntimeContributionInput): TableRuntimeContribution => {
  if (input.reference.trim().length === 0) {
    throw new Error('table: runtime contribution reference must be non-empty');
  }
  const runtimeReference = `@@retikz/table/runtime/${encodeRuntimeReference(input.reference)}`;
  const data = input.data ?? {};
  if (Object.hasOwn(data, runtimeReference)) {
    throw new Error(`table: runtime contribution dataset conflict for reserved reference "${runtimeReference}"`);
  }

  const lowerOptions: LowerTablesOptions = {
    ...(input.lowerOptions ?? {}),
    ...(input.lowerOptions?.structureDefinitions === undefined
      ? {}
      : { structureDefinitions: [...input.lowerOptions.structureDefinitions] }),
    ...(input.lowerOptions?.presentationDefinitions === undefined
      ? {}
      : { presentationDefinitions: [...input.lowerOptions.presentationDefinitions] }),
  };
  const envelope: TableRuntimeEnvelope = Object.freeze({
    [TableRuntimeEnvelopeMarker]: true,
    lowerOptions,
    composites: [...(input.composites ?? [])],
  });
  return {
    datasets: Object.fromEntries([...Object.entries(data), [runtimeReference, envelope]]),
    makeComposites: makeTableRuntimeComposites,
  };
};
