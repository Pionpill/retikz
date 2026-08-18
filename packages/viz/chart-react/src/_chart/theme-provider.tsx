import type { ChartThemeStyleDefinition } from '@retikz/chart';
import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';

import { ChartThemeStylesContext, useChartThemeStyles } from '../shared';

/** Chart 自有上下文主题定义的 Provider 属性 */
export type ChartThemeProviderProps = {
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  children?: ReactNode;
};

/** 为独立 Chart 子树注入 Chart 自有主题定义 */
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
