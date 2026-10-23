import type { TableThemeDefinition } from '@retikz/table';
import { createContext, useContext } from 'react';

/** 向 Table 后代传递主题定义的上下文 */
export const TableThemeDefinitionsContext = createContext<ReadonlyArray<TableThemeDefinition> | undefined>(undefined);

/** 读取当前 standalone Table ambient Theme definitions */
export const useTableThemeDefinitions = (): ReadonlyArray<TableThemeDefinition> | undefined =>
  useContext(TableThemeDefinitionsContext);
