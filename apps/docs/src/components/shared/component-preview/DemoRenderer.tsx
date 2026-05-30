import { Children, type FC, type ReactElement, type ReactNode, cloneElement, isValidElement } from 'react';
import { Layout, type LayoutProps } from '@retikz/react';

import type { RendererMode } from './_shared';

type ElementWithChildrenProps = {
  /** 子节点 */
  children?: ReactNode;
};

const applyRendererMode = (node: ReactNode, rendererMode: RendererMode): ReactNode => {
  if (!isValidElement<ElementWithChildrenProps>(node)) return node;
  if (node.type === Layout) {
    return cloneElement(node as ReactElement<Partial<LayoutProps>>, { renderer: rendererMode });
  }
  if (node.props.children === undefined) return node;
  return cloneElement(
    node,
    undefined,
    Children.map(node.props.children, child => applyRendererMode(child, rendererMode)),
  );
};

export type DemoRendererProps = {
  /** demo 组件 */
  Component: FC;
  /** 当前渲染目标 */
  rendererMode: RendererMode;
};

/** 用当前渲染目标渲染 demo，避免每个示例源码都显式写 renderer */
export const DemoRenderer: FC<DemoRendererProps> = props => {
  const { Component, rendererMode } = props;
  return <>{applyRendererMode(Component({}), rendererMode)}</>;
};
