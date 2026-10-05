import type { ChartThemeDefinition } from '@retikz/chart';
import { createContext, useContext } from 'react';

/** 向 Chart 后代传递命名主题定义的上下文 */
export const ChartThemeDefinitionsContext = createContext<ReadonlyArray<ChartThemeDefinition> | undefined>(undefined);

/** 读取当前 standalone Chart 子树的 named Theme definitions */
export const useChartThemeDefinitions = (): ReadonlyArray<ChartThemeDefinition> | undefined =>
  useContext(ChartThemeDefinitionsContext);
