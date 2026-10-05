import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzTableError } from '../../error';
import type { LowerTablesOptions } from '../types';
import { createTableNestedDefinitionProvider, createTableProvider } from './provider';
import type { TableRuntimeContribution, TableRuntimeContributionInput } from './types';

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
    ...Object.fromEntries(
      (
        [
          'structureDefinitions',
          'presentationDefinitions',
          'formatterDefinitions',
          'visualScaleDefinitions',
          'tableThemeStyles',
          'formatDefinitions',
          'transformDefinitions',
          'statisticsReducerDefinitions',
          'rowSelectorDefinitions',
          'regressionDefinitions',
          'transformImplementations',
          'statisticsReducerImplementations',
          'rowSelectorImplementations',
          'regressionImplementations',
        ] satisfies Array<keyof LowerTablesOptions>
      ).map(key => {
        const entries = input[key];
        return [key, entries === undefined ? undefined : Object.freeze([...entries])];
      }),
    ),
  });

/** 创建供 React 与 Vanilla 宿主统一聚合的 Table runtime contribution */
export const createTableRuntimeContribution = (input: TableRuntimeContributionInput): TableRuntimeContribution => {
  assertNonEmptyString(
    input.reference,
    'table runtime contribution reference',
    new RetikzTableError('table runtime contribution reference must be a non-empty string.'),
  );
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
