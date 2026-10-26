import type { LowerTablesOptions } from '../types';
import { createTableNestedDefinitionProvider, createTableProvider } from './composite';
import type { TableRuntimeContribution, TableRuntimeContributionInput } from './types';

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
          'tableThemeDefinitions',
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
        ] satisfies Array<keyof LowerTablesOptions>
      ).map(key => {
        const entries = input[key];
        return [key, entries === undefined ? undefined : Object.freeze([...entries])];
      }),
    ),
  });

/** 创建供 React 与 Vanilla 宿主统一聚合的 Table runtime contribution */
export const createTableRuntimeContribution = (input: TableRuntimeContributionInput): TableRuntimeContribution => {
  const tableProvider = createTableProvider(input.data ?? {}, snapshotLowerOptions(input.lowerOptions ?? {}));
  const nestedProviders = [...(input.composites ?? [])].map(createTableNestedDefinitionProvider);

  return {
    roots: Object.freeze([tableProvider.key, ...nestedProviders.map(provider => provider.key)]),
    providers: Object.freeze([tableProvider, ...nestedProviders]),
  };
};
