import type { TableThemeStyleDefinition } from '@retikz/table';

import { createContext, useContext } from 'react';

/** Table-owned ambient Theme definitions context */
export const TableThemeStylesContext = createContext<ReadonlyArray<TableThemeStyleDefinition> | undefined>(undefined);

/** 读取当前 standalone Table ambient Theme definitions */
export const useTableThemeStyles = (): ReadonlyArray<TableThemeStyleDefinition> | undefined =>
  useContext(TableThemeStylesContext);
