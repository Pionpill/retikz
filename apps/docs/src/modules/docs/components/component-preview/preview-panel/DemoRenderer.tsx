import type { FC } from 'react';

import { RendererModeProvider } from '@retikz/react';
import { memo } from 'react';

import type { PreviewTheme } from '../theme';
import type { RendererMode } from '../types';

import { PreviewThemeProvider } from '../theme';

export type DemoRendererProps = {
  /** demo 组件。 */
  Component: FC;
  /** 当前渲染目标。 */
  rendererMode: RendererMode;
  /** 当前预览实际生效的 ThemeStyle。 */
  theme?: PreviewTheme;
  /** 当前预览使用的明暗选择。 */
};

/** 用当前渲染目标渲染 demo，避免每个示例源码都显式写 renderer。 */
const DemoRendererComponent: FC<DemoRendererProps> = props => {
  const { Component, rendererMode, theme } = props;
  return (
    <PreviewThemeProvider theme={theme}>
      <RendererModeProvider mode={rendererMode}>
        <Component />
      </RendererModeProvider>
    </PreviewThemeProvider>
  );
};

/** 跳过与 renderer 和 demo 无关的宿主状态更新。 */
export const DemoRenderer = memo(DemoRendererComponent);
