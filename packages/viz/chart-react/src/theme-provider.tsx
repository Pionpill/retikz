import type { ChartThemeStyleDefinition } from '@retikz/chart';
import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';

import { ChartThemeStylesContext, useChartThemeStyles } from './theme-context';

/** Chart-owned ambient Theme definitions Provider props */
export type ChartThemeProviderProps = {
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  children?: ReactNode;
};

/** 为 standalone Chart 子树注入 Chart-owned Theme definitions */
export const ChartThemeProvider: FC<ChartThemeProviderProps> = props => {
  const { chartThemeStyles, children } = props;
  const parent = useChartThemeStyles();
  const merged = useMemo(() => {
    if (parent === undefined) return chartThemeStyles;
    if (chartThemeStyles === undefined) return parent;
    return [...parent, ...chartThemeStyles];
  }, [parent, chartThemeStyles]);
  return <ChartThemeStylesContext.Provider value={merged}>{children}</ChartThemeStylesContext.Provider>;
};
