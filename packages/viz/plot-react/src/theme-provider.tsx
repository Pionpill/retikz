import type { PlotThemeDefinition } from '@retikz/plot';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import { PlotThemeDefinitionsContext, usePlotThemeDefinitions } from './theme-context';

/** Plot 主题定义上下文组件的属性 */
export type PlotThemeProviderProps = {
  /** 追加到父上下文定义之后的 Plot 主题样式定义；省略时沿用父上下文 */
  plotThemeDefinitions?: ReadonlyArray<PlotThemeDefinition>;
  /** 可读取该 Plot 主题定义上下文的 React 子树 */
  children?: ReactNode;
};

/** 为 standalone Plot 子树注入 Plot-owned Theme definitions */
export const PlotThemeProvider: FC<PlotThemeProviderProps> = props => {
  const { plotThemeDefinitions, children } = props;
  const parent = usePlotThemeDefinitions();
  const merged = useMemo(() => {
    if (parent === undefined) return plotThemeDefinitions;
    if (plotThemeDefinitions === undefined) return parent;
    return [...parent, ...plotThemeDefinitions];
  }, [parent, plotThemeDefinitions]);

  return <PlotThemeDefinitionsContext.Provider value={merged}>{children}</PlotThemeDefinitionsContext.Provider>;
};
