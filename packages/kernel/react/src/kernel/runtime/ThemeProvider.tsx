import type { IRScene } from '@retikz/core';
import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';

import { mergeThemeOverlays, ThemeContext, useTheme } from './theme-context';

export type ThemeProviderProps = {
  /** 注入给子树 `<Layout>` 的 sparse Theme */
  theme?: IRScene['theme'];
  /** 子树 */
  children?: ReactNode;
};

/** ambient Theme Provider */
export const ThemeProvider: FC<ThemeProviderProps> = props => {
  const { theme, children } = props;
  const parentTheme = useTheme();
  const mergedTheme = useMemo(() => mergeThemeOverlays(parentTheme, theme), [parentTheme, theme]);

  return <ThemeContext.Provider value={mergedTheme}>{children}</ThemeContext.Provider>;
};
