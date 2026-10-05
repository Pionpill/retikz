import type { TableThemeStyleDefinition } from '@retikz/table';
import { createContext, useContext } from 'react';

/** 向 Table 后代传递主题定义的上下文 */
export const TableThemeStylesContext = createContext<ReadonlyArray<TableThemeStyleDefinition> | undefined>(undefined);

/** 读取当前 standalone Table ambient Theme definitions */
export const useTableThemeStyles = (): ReadonlyArray<TableThemeStyleDefinition> | undefined =>
  useContext(TableThemeStylesContext);
