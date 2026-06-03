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
  /**
   * 交互式 demo（含 hooks / 异步 fetch）：以真 React 元素 `<Component/>` 渲染，让 hooks 生效
   * @description 非交互 demo 走 `Component({})` 纯函数调用 + 输出树改写注入 renderer；交互 demo 无法被静态展开，
   *   故不注入 renderer（由 demo 自身的 `<Layout renderer>` 决定，默认 svg），svg/canvas 切换对其不可用
   */
  interactive?: boolean;
};

/** 用当前渲染目标渲染 demo，避免每个示例源码都显式写 renderer */
export const DemoRenderer: FC<DemoRendererProps> = props => {
  const { Component, rendererMode, interactive } = props;
  if (interactive) return <Component />;
  return <>{applyRendererMode(Component({}), rendererMode)}</>;
};
