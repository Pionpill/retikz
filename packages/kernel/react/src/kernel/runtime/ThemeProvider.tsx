import type { IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';

import { mergeThemeOverlays, ThemeContext, useTheme } from './theme-context';
import { mergeThemeStyleDefinitions, ThemeStylesContext, useThemeStyles } from './theme-styles-context';

export type ThemeProviderProps = {
  /** 注入给子树 `<Layout>` 的 sparse Theme */
  theme?: IRScene['theme'];
  /** 注入给子树 `<Layout>` 的 Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
  /** 子树 */
  children?: ReactNode;
};

/** ambient Theme Provider */
export const ThemeProvider: FC<ThemeProviderProps> = props => {
  const { theme, themeStyles, children } = props;
  const parentTheme = useTheme();
  const parentThemeStyles = useThemeStyles();
  const mergedTheme = useMemo(() => mergeThemeOverlays(parentTheme, theme), [parentTheme, theme]);
  const mergedThemeStyles = useMemo(
    () => mergeThemeStyleDefinitions(parentThemeStyles, themeStyles),
    [parentThemeStyles, themeStyles],
  );

  return (
    <ThemeStylesContext.Provider value={mergedThemeStyles}>
      <ThemeContext.Provider value={mergedTheme}>{children}</ThemeContext.Provider>
    </ThemeStylesContext.Provider>
  );
};
