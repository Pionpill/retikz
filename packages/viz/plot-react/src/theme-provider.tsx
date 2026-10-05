import type { PlotThemeStyleDefinition } from '@retikz/plot';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import { PlotThemeStylesContext, usePlotThemeStyles } from './theme-context';

/** Plot 主题定义上下文组件的属性 */
export type PlotThemeProviderProps = {
  /** 追加到父上下文定义之后的 Plot 主题样式定义；省略时沿用父上下文 */
  plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
  /** 可读取该 Plot 主题定义上下文的 React 子树 */
  children?: ReactNode;
};

/** 为 standalone Plot 子树注入 Plot-owned Theme definitions */
export const PlotThemeProvider: FC<PlotThemeProviderProps> = props => {
  const { plotThemeStyles, children } = props;
  const parent = usePlotThemeStyles();
  const merged = useMemo(() => {
    if (parent === undefined) return plotThemeStyles;
    if (plotThemeStyles === undefined) return parent;
    return [...parent, ...plotThemeStyles];
  }, [parent, plotThemeStyles]);

  return <PlotThemeStylesContext.Provider value={merged}>{children}</PlotThemeStylesContext.Provider>;
};
