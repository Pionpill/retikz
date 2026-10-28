import type { TablesLoweringOptions } from '../types';
import { createTableNestedDefinitionProvider, createTableProvider } from './composite';
import type { TableRuntimeContribution, InputTableRuntimeContribution } from './types';

/** 防御性复制 Table lowering definitions 的外层数组 */
const snapshotLowerOptions = (input: TablesLoweringOptions): TablesLoweringOptions =>
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
        ] satisfies Array<keyof TablesLoweringOptions>
      ).map(key => {
        const entries = input[key];
        return [key, entries === undefined ? undefined : Object.freeze([...entries])];
      }),
    ),
  });

/** 创建供 React 与 Vanilla 宿主统一聚合的 Table runtime contribution */
export const createTableRuntimeContribution = (input: InputTableRuntimeContribution): TableRuntimeContribution => {
  const tableProvider = createTableProvider(input.data ?? {}, snapshotLowerOptions(input.lowerOptions ?? {}));
  const nestedProviders = [...(input.composites ?? [])].map(createTableNestedDefinitionProvider);

  return {
    roots: Object.freeze([tableProvider.key, ...nestedProviders.map(provider => provider.key)]),
    providers: Object.freeze([tableProvider, ...nestedProviders]),
  };
};
