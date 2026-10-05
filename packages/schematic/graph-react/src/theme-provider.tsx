import type { GraphThemeStyleDefinition } from '@retikz/graph';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import { GraphThemeStylesContext, useGraphThemeStyles } from './theme-context';

/** Graph 主题定义上下文组件的属性 */
export type GraphThemeProviderProps = {
  /** 在当前子树中提供的 Graph 主题样式定义 */
  graphThemeStyles?: ReadonlyArray<GraphThemeStyleDefinition>;
  /** 使用当前 Graph 主题定义上下文的子内容 */
  children?: ReactNode;
};

/** 为 standalone Graph 子树注入 Graph-owned Theme definitions */
export const GraphThemeProvider: FC<GraphThemeProviderProps> = props => {
  const { graphThemeStyles, children } = props;
  const parent = useGraphThemeStyles();
  const merged = useMemo(() => {
    if (parent === undefined) return graphThemeStyles;
    if (graphThemeStyles === undefined) return parent;
    return [...parent, ...graphThemeStyles];
  }, [parent, graphThemeStyles]);

  return <GraphThemeStylesContext.Provider value={merged}>{children}</GraphThemeStylesContext.Provider>;
};
