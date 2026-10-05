import type { PlotThemeStyleDefinition } from '@retikz/plot';
import { createContext, useContext } from 'react';

/** 向 Plot 后代传递主题定义的上下文 */
export const PlotThemeStylesContext = createContext<ReadonlyArray<PlotThemeStyleDefinition> | undefined>(undefined);

/** 读取当前 standalone Plot ambient Theme definitions */
export const usePlotThemeStyles = (): ReadonlyArray<PlotThemeStyleDefinition> | undefined =>
  useContext(PlotThemeStylesContext);
