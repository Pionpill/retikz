import type { FC, ReactNode } from 'react';

import { ThemeProvider } from '@retikz/react';

import { usePreviewTheme } from './usePreviewTheme';

export type PreviewThemeProviderProps = {
  /** ComponentPreview 动态渲染内容 */
  children?: ReactNode;
};

/** 连接 docs 偏好与 retikz ambient Theme 的预览 Provider */
export const PreviewThemeProvider: FC<PreviewThemeProviderProps> = props => {
  const { children } = props;
  const theme = usePreviewTheme();

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
