import type { IRScene, ThemeDefinition } from '@retikz/core';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import { mergeThemeOverlays, ThemeContext, useTheme } from './theme-context';
import { mergeThemeDefinitions, ThemeDefinitionsContext, useThemeDefinitions } from './theme-definitions-context';

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
