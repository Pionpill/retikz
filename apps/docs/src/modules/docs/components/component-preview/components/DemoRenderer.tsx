import type { LayoutProps } from '@retikz/react';
import type { FC, ReactElement, ReactNode } from 'react';

import { Layout, RendererModeProvider } from '@retikz/react';
import { Children, cloneElement, isValidElement } from 'react';

import type { RendererMode } from '../types';

type ElementWithChildrenProps = {
  /** 子节点 */
  children?: ReactNode;
};

const applyRendererMode = (node: ReactNode, rendererMode: RendererMode): ReactNode => {
  if (!isValidElement<ElementWithChildrenProps>(node)) return node;
  if (node.type === Layout) {
    const layoutNode = node as ReactElement<Partial<LayoutProps>>;
    // 尊重 demo 显式写的 renderer（如 canvas-only 自定义属性通道 demo）；未写时才跟随预览工具栏
    if (layoutNode.props.renderer !== undefined) return layoutNode;
    return cloneElement(layoutNode, { renderer: rendererMode });
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
  /** 是否以真 React 元素渲染。 */
  interactive?: boolean;
};

/** 用当前渲染目标渲染 demo，避免每个示例源码都显式写 renderer */
export const DemoRenderer: FC<DemoRendererProps> = props => {
  const { Component, rendererMode, interactive } = props;
  if (interactive) {
    return (
      <RendererModeProvider mode={rendererMode}>
        <Component />
      </RendererModeProvider>
    );
  }
  return <RendererModeProvider mode={rendererMode}>{applyRendererMode(Component({}), rendererMode)}</RendererModeProvider>;
};

/** 把一段 SVG 字符串注入渲染区。 */
export const RawSvgFrame: FC<{ svg: string }> = ({ svg }) => (
  <div
    className="flex max-h-full max-w-full [&>svg]:max-h-full [&>svg]:max-w-full"
    dangerouslySetInnerHTML={{ __html: svg }}
  />
);
