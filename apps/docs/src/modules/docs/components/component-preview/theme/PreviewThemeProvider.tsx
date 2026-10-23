import { ChartThemeProvider } from '@retikz/chart-react';
import { GraphThemeProvider } from '@retikz/graph-react';
import { PlotThemeProvider } from '@retikz/plot-react';
import { ThemeProvider } from '@retikz/react';
import { TableThemeProvider } from '@retikz/table-react';
import type { FC, ReactNode } from 'react';

import type { PreviewTheme } from './constants';
import { PreviewThemeDefinitionBundle, PreviewThemeDefinitionsContext } from './presets';
import { usePreviewTheme } from './usePreviewTheme';

export type PreviewThemeProviderProps = {
  /** ComponentPreview 动态渲染内容 */
  children?: ReactNode;
  /** 单张预览显式选择的 Theme；缺省时跟随全局设置 */
  theme?: PreviewTheme;
  /** 单张预览的明暗选择；inherit 或缺省时跟随站点主题 */
};

/** 连接 docs 偏好与 retikz ambient Theme 的预览 Provider */
export const PreviewThemeProvider: FC<PreviewThemeProviderProps> = props => {
  const { children, theme } = props;
  const globalTheme = usePreviewTheme();
  const resolvedTheme = theme ?? globalTheme;

  return (
    <PreviewThemeDefinitionsContext.Provider value={PreviewThemeDefinitionBundle}>
      <ThemeProvider theme={resolvedTheme} themeDefinitions={PreviewThemeDefinitionBundle.core}>
        <GraphThemeProvider graphThemeDefinitions={PreviewThemeDefinitionBundle.graph}>
          <ChartThemeProvider chartThemeDefinitions={PreviewThemeDefinitionBundle.chart}>
            <PlotThemeProvider plotThemeDefinitions={PreviewThemeDefinitionBundle.plot}>
              <TableThemeProvider tableThemeDefinitions={PreviewThemeDefinitionBundle.table}>
                {children}
              </TableThemeProvider>
            </PlotThemeProvider>
          </ChartThemeProvider>
        </GraphThemeProvider>
      </ThemeProvider>
    </PreviewThemeDefinitionsContext.Provider>
  );
};
