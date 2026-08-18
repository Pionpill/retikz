import { assertNonEmptyString } from '@retikz/foundation';

import type { LowerTablesOptions } from '../types';
import type { TableRuntimeContribution, TableRuntimeContributionInput } from './types';

import { RetikzTableError } from '../../error';
import { createTableNestedDefinitionProvider, createTableProvider } from './provider';

/** 把任意 JSON 字符串编码为稳定且无碰撞的 runtime reference 片段 */
const encodeRuntimeReference = (reference: string): string =>
  Array.from(reference, character => {
    const codeUnit = character.charCodeAt(0);
    const isLoneSurrogate = character.length === 1 && codeUnit >= 0xd800 && codeUnit <= 0xdfff;
    return isLoneSurrogate
      ? `%u${codeUnit.toString(16).padStart(4, '0').toUpperCase()}`
      : encodeURIComponent(character);
  }).join('');

/** 防御性复制 Table lowering definitions 的外层数组 */
const snapshotLowerOptions = (input: LowerTablesOptions): LowerTablesOptions =>
  Object.freeze({
    ...input,
    ...(input.structureDefinitions === undefined
      ? {}
      : { structureDefinitions: Object.freeze([...input.structureDefinitions]) }),
    ...(input.presentationDefinitions === undefined
      ? {}
      : { presentationDefinitions: Object.freeze([...input.presentationDefinitions]) }),
    ...(input.formatterDefinitions === undefined
      ? {}
      : { formatterDefinitions: Object.freeze([...input.formatterDefinitions]) }),
    ...(input.visualScaleDefinitions === undefined
      ? {}
      : { visualScaleDefinitions: Object.freeze([...input.visualScaleDefinitions]) }),
    ...(input.tableThemeStyles === undefined ? {} : { tableThemeStyles: Object.freeze([...input.tableThemeStyles]) }),
  });

/** 创建供 React 与 Vanilla 宿主统一聚合的 Table runtime contribution */
export const createTableRuntimeContribution = (input: TableRuntimeContributionInput): TableRuntimeContribution => {
  assertNonEmptyString(input.reference, 'table runtime contribution reference');
  const runtimeReference = `@@retikz/table/runtime/${encodeRuntimeReference(input.reference)}`;
  const data = input.data ?? {};
  if (Object.hasOwn(data, runtimeReference)) {
    throw new RetikzTableError(
      `table: runtime contribution dataset conflict for reserved reference "${runtimeReference}"`,
    );
  }

  const tableProvider = createTableProvider(data, runtimeReference, snapshotLowerOptions(input.lowerOptions ?? {}));
  const nestedProviders = [...(input.composites ?? [])].map(createTableNestedDefinitionProvider);
  return {
    roots: Object.freeze([tableProvider.key, ...nestedProviders.map(provider => provider.key)]),
    providers: Object.freeze([tableProvider, ...nestedProviders]),
  };
};
