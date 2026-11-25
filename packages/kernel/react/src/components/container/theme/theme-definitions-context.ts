import type { ThemeDefinition } from '@retikz/core';
import { createContext, useContext } from 'react';

/** 子树 `<Layout>` 可继承的 Core Theme definitions */
export const ThemeDefinitionsContext = createContext<ReadonlyArray<ThemeDefinition> | undefined>(undefined);

/** 读取当前 ambient Core Theme definitions */
export const useThemeDefinitions = (): ReadonlyArray<ThemeDefinition> | undefined =>
  useContext(ThemeDefinitionsContext);

/** 按祖先到局部顺序合并 definitions，重复名留给 Core registry 统一诊断 */
export const mergeThemeDefinitions = (
  ambient: ReadonlyArray<ThemeDefinition> | undefined,
  local: ReadonlyArray<ThemeDefinition> | undefined,
): ReadonlyArray<ThemeDefinition> | undefined => {
  if (ambient === undefined) return local;
  if (local === undefined) return ambient;
  return [...ambient, ...local];
};
