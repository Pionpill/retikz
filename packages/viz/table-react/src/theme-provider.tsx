import type { TableThemeDefinition } from '@retikz/table';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import { TableThemeDefinitionsContext, useTableThemeDefinitions } from './theme-context';

/** Table 主题定义上下文组件的属性 */
export type TableThemeProviderProps = {
  /** 当前子树可用的表格主题样式定义 */
  tableThemeDefinitions?: ReadonlyArray<TableThemeDefinition>;
  /** 使用当前表格主题定义上下文的子内容 */
  children?: ReactNode;
};

/** 为 standalone Table 子树注入 Table-owned Theme definitions */
export const TableThemeProvider: FC<TableThemeProviderProps> = props => {
  const { tableThemeDefinitions, children } = props;
  const parent = useTableThemeDefinitions();
  const merged = useMemo(() => {
    if (parent === undefined) return tableThemeDefinitions;
    if (tableThemeDefinitions === undefined) return parent;
    return [...parent, ...tableThemeDefinitions];
  }, [parent, tableThemeDefinitions]);

  return <TableThemeDefinitionsContext.Provider value={merged}>{children}</TableThemeDefinitionsContext.Provider>;
};
