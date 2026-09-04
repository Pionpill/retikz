import type { InputFlowLayout } from '@retikz/diagram-vanilla/flow';
import type { FC, ReactNode } from 'react';

import type { FlowMarkerComponent } from './authoring';

type FlowLayoutMarkerProps<TLayout extends InputFlowLayout = InputFlowLayout> = TLayout extends InputFlowLayout
  ? Omit<TLayout, 'children'>
  : never;

/** Flow Layout 的 React 编写参数 */
export type FlowLayoutProps = FlowLayoutMarkerProps &
  Readonly<{
    /** 递归 Flow Entity、Group 或 Layout children */
    children?: ReactNode;
  }>;

const FlowLayoutComponent: FC<FlowLayoutProps> = () => null;

/** 声明 FlowDiagram 中无外壳的作者指定布局 */
export const FlowLayout = FlowLayoutComponent as FlowMarkerComponent<FlowLayoutProps>;

FlowLayout.displayName = 'FlowLayout';
FlowLayout.flowMarkerKind = 'layout';
