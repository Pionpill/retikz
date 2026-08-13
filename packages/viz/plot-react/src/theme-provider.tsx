import type { PlotThemeStyleDefinition } from '@retikz/plot';
import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';

import { PlotThemeStylesContext, usePlotThemeStyles } from './theme-context';

/** Plot-owned ambient Theme definitions Provider props */
export type PlotThemeProviderProps = {
  plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
  children?: ReactNode;
};

/** 为 standalone Plot 子树注入 Plot-owned Theme definitions */
export const PlotThemeProvider: FC<PlotThemeProviderProps> = props => {
  const { plotThemeStyles, children } = props;
  const parent = usePlotThemeStyles();
  const merged = useMemo(() => {
    if (parent === undefined) return plotThemeStyles;
    if (plotThemeStyles === undefined) return parent;
    return [...parent, ...plotThemeStyles];
  }, [parent, plotThemeStyles]);
  return <PlotThemeStylesContext.Provider value={merged}>{children}</PlotThemeStylesContext.Provider>;
};
