import type { IRScene, IRTheme, ThemeDefinition } from '@retikz/core';
import { mergeDefinedProperties } from '@retikz/foundation';
import type { Context, FC, ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

/** 按字段覆盖嵌套 React Theme Provider，未声明 selector 继续继承 */
export const mergeThemeOverlays = (...layers: ReadonlyArray<IRTheme | undefined>): IRTheme | undefined => {
  const merged = mergeDefinedProperties<IRTheme>(layers);
  return merged.name === undefined && merged.mode === undefined ? undefined : merged;
};

/** React 子树继承的 sparse Theme */
export const ThemeContext: Context<IRTheme | undefined> = createContext<IRTheme | undefined>(undefined);

/** 读取最近的 ambient Theme */
export const useTheme = (): IRTheme | undefined => useContext(ThemeContext);

/** 子树 `<Layout>` 可继承的 Core Theme definitions */
const ThemeDefinitionsContext = createContext<ReadonlyArray<ThemeDefinition> | undefined>(undefined);

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

/** 向子树 Layout 注入主题覆盖与主题风格定义 */
export type ThemeProviderProps = {
  /** 注入给子树 `<Layout>` 的 sparse Theme */
  theme?: IRScene['theme'];
  /** 注入给子树 `<Layout>` 的 Core Theme definitions */
  themeDefinitions?: ReadonlyArray<ThemeDefinition>;
  /** 子树 */
  children?: ReactNode;
};

/** 向后代提供主题上下文的组件 */
export const ThemeProvider: FC<ThemeProviderProps> = props => {
  const { theme, themeDefinitions, children } = props;
  const parentTheme = useTheme();
  const parentThemeDefinitions = useThemeDefinitions();
  const mergedTheme = useMemo(() => mergeThemeOverlays(parentTheme, theme), [parentTheme, theme]);
  const mergedThemeDefinitions = useMemo(
    () => mergeThemeDefinitions(parentThemeDefinitions, themeDefinitions),
    [parentThemeDefinitions, themeDefinitions],
  );

  return (
    <ThemeDefinitionsContext.Provider value={mergedThemeDefinitions}>
      <ThemeContext.Provider value={mergedTheme}>{children}</ThemeContext.Provider>
    </ThemeDefinitionsContext.Provider>
  );
};
