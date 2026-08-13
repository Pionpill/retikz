import type { TableThemeStyleDefinition } from '@retikz/table';
import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';

import { TableThemeStylesContext, useTableThemeStyles } from './theme-context';

/** Table-owned ambient Theme definitions Provider props */
export type TableThemeProviderProps = {
  tableThemeStyles?: ReadonlyArray<TableThemeStyleDefinition>;
  children?: ReactNode;
};

/** 为 standalone Table 子树注入 Table-owned Theme definitions */
export const TableThemeProvider: FC<TableThemeProviderProps> = props => {
  const { tableThemeStyles, children } = props;
  const parent = useTableThemeStyles();
  const merged = useMemo(() => {
    if (parent === undefined) return tableThemeStyles;
    if (tableThemeStyles === undefined) return parent;
    return [...parent, ...tableThemeStyles];
  }, [parent, tableThemeStyles]);
  return <TableThemeStylesContext.Provider value={merged}>{children}</TableThemeStylesContext.Provider>;
};
