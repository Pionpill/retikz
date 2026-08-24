import type { ChartThemeDefinition } from '@retikz/chart';

import { createContext, useContext } from 'react';

/** Chart-owned ambient named Theme definitions context */
export const ChartThemeDefinitionsContext = createContext<ReadonlyArray<ChartThemeDefinition> | undefined>(undefined);

/** 读取当前 standalone Chart 子树的 named Theme definitions */
export const useChartThemeDefinitions = (): ReadonlyArray<ChartThemeDefinition> | undefined =>
  useContext(ChartThemeDefinitionsContext);
