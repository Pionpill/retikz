import type { FC, ReactNode } from 'react';

import { PlotThemeProvider } from '@retikz/plot-react';
import { ThemeProvider } from '@retikz/react';
import { TableThemeProvider } from '@retikz/table-react';

import type { PreviewThemeMode } from '../types';
import type { PreviewThemeStyleValue } from './constants';

import { PreviewThemeDefinitionBundle, PreviewThemeDefinitionsContext } from './presets';
import { usePreviewTheme } from './usePreviewTheme';

export type PreviewThemeProviderProps = {
  /** ComponentPreview 动态渲染内容 */
  children?: ReactNode;
  /** 单张预览显式选择的 ThemeStyle；缺省时跟随全局设置 */
  themeStyle?: PreviewThemeStyleValue;
  /** 单张预览的明暗选择；inherit 或缺省时跟随站点主题 */
  themeMode?: PreviewThemeMode;
};

/** 连接 docs 偏好与 retikz ambient Theme 的预览 Provider */
export const PreviewThemeProvider: FC<PreviewThemeProviderProps> = props => {
  const { children, themeStyle, themeMode } = props;
  const theme = usePreviewTheme(themeStyle, themeMode);

  return (
    <PreviewThemeDefinitionsContext.Provider value={PreviewThemeDefinitionBundle}>
      <ThemeProvider theme={theme} themeStyles={PreviewThemeDefinitionBundle.core}>
        <PlotThemeProvider plotThemeStyles={PreviewThemeDefinitionBundle.plot}>
          <TableThemeProvider tableThemeStyles={PreviewThemeDefinitionBundle.table}>{children}</TableThemeProvider>
        </PlotThemeProvider>
      </ThemeProvider>
    </PreviewThemeDefinitionsContext.Provider>
  );
};
