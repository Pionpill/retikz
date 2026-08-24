import type { ChartThemeDefinition } from '@retikz/chart';
import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';

import { ChartThemeDefinitionsContext, useChartThemeDefinitions } from '../shared';

/** Chart-owned named Theme definitions 的 Provider 属性 */
export type ChartThemeProviderProps = Readonly<{
  /** 注入当前具体 chartType provider 可见的 named Theme definitions */
  themeDefinitions?: ReadonlyArray<ChartThemeDefinition>;
  children?: ReactNode;
}>;

/** 为独立 Chart 子树注入 named Theme definitions */
export const ChartThemeProvider: FC<ChartThemeProviderProps> = props => {
  const { themeDefinitions, children } = props;
  const parent = useChartThemeDefinitions();
  const merged = useMemo(() => {
    if (parent === undefined) return themeDefinitions;
    if (themeDefinitions === undefined) return parent;
    return [...parent, ...themeDefinitions];
  }, [parent, themeDefinitions]);
  return <ChartThemeDefinitionsContext.Provider value={merged}>{children}</ChartThemeDefinitionsContext.Provider>;
};
