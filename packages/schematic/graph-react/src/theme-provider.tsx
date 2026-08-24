import type { GraphThemeStyleDefinition } from '@retikz/graph';
import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';

import { GraphThemeStylesContext, useGraphThemeStyles } from './theme-context';

/** Graph-owned ambient Theme definitions Provider props */
export type GraphThemeProviderProps = {
  graphThemeStyles?: ReadonlyArray<GraphThemeStyleDefinition>;
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
