import type { PlotThemeStyleDefinition } from '@retikz/plot';

import { createContext, useContext } from 'react';

/** Plot-owned ambient Theme definitions context */
export const PlotThemeStylesContext = createContext<ReadonlyArray<PlotThemeStyleDefinition> | undefined>(undefined);

/** 读取当前 standalone Plot ambient Theme definitions */
export const usePlotThemeStyles = (): ReadonlyArray<PlotThemeStyleDefinition> | undefined =>
  useContext(PlotThemeStylesContext);
