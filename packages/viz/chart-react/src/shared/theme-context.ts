import type { ChartThemeStyleDefinition } from '@retikz/chart';

import { createContext, useContext } from 'react';

/** Chart-owned ambient Theme definitions context */
export const ChartThemeStylesContext = createContext<ReadonlyArray<ChartThemeStyleDefinition> | undefined>(undefined);

/** 读取当前 standalone Chart ambient Theme definitions */
export const useChartThemeStyles = (): ReadonlyArray<ChartThemeStyleDefinition> | undefined =>
  useContext(ChartThemeStylesContext);
