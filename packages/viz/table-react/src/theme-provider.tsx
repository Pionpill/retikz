import type { TableThemeStyleDefinition } from '@retikz/table';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import { TableThemeStylesContext, useTableThemeStyles } from './theme-context';

/** Table 主题定义上下文组件的属性 */
export type TableThemeProviderProps = {
  /** 当前子树可用的表格主题样式定义 */
  tableThemeStyles?: ReadonlyArray<TableThemeStyleDefinition>;
  /** 使用当前表格主题定义上下文的子内容 */
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
