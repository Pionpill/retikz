import type { GraphThemeDefinition } from '@retikz/graph';
import { createContext, useContext } from 'react';

/** 向 Graph 后代传递主题定义的上下文 */
export const GraphThemeDefinitionsContext = createContext<ReadonlyArray<GraphThemeDefinition> | undefined>(undefined);

/** 读取当前 standalone Graph ambient Theme definitions */
export const useGraphThemeDefinitions = (): ReadonlyArray<GraphThemeDefinition> | undefined =>
  useContext(GraphThemeDefinitionsContext);
