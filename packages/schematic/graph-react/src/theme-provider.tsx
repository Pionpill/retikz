import type { GraphThemeDefinition } from '@retikz/graph';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import { GraphThemeDefinitionsContext, useGraphThemeDefinitions } from './theme-context';

/** Graph 主题定义上下文组件的属性 */
export type GraphThemeProviderProps = {
  /** 在当前子树中提供的 Graph 主题样式定义 */
  graphThemeDefinitions?: ReadonlyArray<GraphThemeDefinition>;
  /** 使用当前 Graph 主题定义上下文的子内容 */
  children?: ReactNode;
};

/** 为 standalone Graph 子树注入 Graph-owned Theme definitions */
export const GraphThemeProvider: FC<GraphThemeProviderProps> = props => {
  const { graphThemeDefinitions, children } = props;
  const parent = useGraphThemeDefinitions();
  const merged = useMemo(() => {
    if (parent === undefined) return graphThemeDefinitions;
    if (graphThemeDefinitions === undefined) return parent;
    return [...parent, ...graphThemeDefinitions];
  }, [parent, graphThemeDefinitions]);

  return <GraphThemeDefinitionsContext.Provider value={merged}>{children}</GraphThemeDefinitionsContext.Provider>;
};
