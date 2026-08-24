import type { ChartThemeDefinition } from '@retikz/chart';

/** 将 ambient Chart Theme definitions 合并到当前具体 chartType provider 输入 */
export const mergeThemeDefinitions = (
  definitions: ReadonlyArray<ChartThemeDefinition> | undefined,
  ambient: ReadonlyArray<ChartThemeDefinition> | undefined,
): ReadonlyArray<ChartThemeDefinition> | undefined => {
  if (ambient === undefined || ambient.length === 0) return definitions;
  return definitions === undefined ? ambient : [...ambient, ...definitions];
};
