import type { ThemeStyleDefinition } from '@retikz/core';

import { createContext, useContext } from 'react';

/** 子树 `<Layout>` 可继承的 Core Theme definitions */
export const ThemeStylesContext = createContext<ReadonlyArray<ThemeStyleDefinition> | undefined>(undefined);

/** 读取当前 ambient Core Theme definitions */
export const useThemeStyles = (): ReadonlyArray<ThemeStyleDefinition> | undefined => useContext(ThemeStylesContext);

/** 按祖先到局部顺序合并 definitions，重复名留给 Core registry 统一诊断 */
export const mergeThemeStyleDefinitions = (
  ambient: ReadonlyArray<ThemeStyleDefinition> | undefined,
  local: ReadonlyArray<ThemeStyleDefinition> | undefined,
): ReadonlyArray<ThemeStyleDefinition> | undefined => {
  if (ambient === undefined) return local;
  if (local === undefined) return ambient;
  return [...ambient, ...local];
};
