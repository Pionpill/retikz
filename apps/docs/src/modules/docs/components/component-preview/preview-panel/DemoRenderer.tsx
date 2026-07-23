import type { FC } from 'react';

import { RendererModeProvider } from '@retikz/react';
import { memo } from 'react';

import type { RendererMode } from '../types';

export type DemoRendererProps = {
  /** demo 组件。 */
  Component: FC;
  /** 当前渲染目标。 */
  rendererMode: RendererMode;
};

/** 用当前渲染目标渲染 demo，避免每个示例源码都显式写 renderer。 */
const DemoRendererComponent: FC<DemoRendererProps> = props => {
  const { Component, rendererMode } = props;
  return (
    <RendererModeProvider mode={rendererMode}>
      <Component />
    </RendererModeProvider>
  );
};

/** 跳过与 renderer 和 demo 无关的宿主状态更新。 */
export const DemoRenderer = memo(DemoRendererComponent);
