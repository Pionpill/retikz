import type { GraphThemeStyleDefinition } from '@retikz/graph';

import { createContext, useContext } from 'react';

/** Graph-owned ambient Theme definitions context */
export const GraphThemeStylesContext = createContext<ReadonlyArray<GraphThemeStyleDefinition> | undefined>(undefined);

/** 读取当前 standalone Graph ambient Theme definitions */
export const useGraphThemeStyles = (): ReadonlyArray<GraphThemeStyleDefinition> | undefined =>
  useContext(GraphThemeStylesContext);
