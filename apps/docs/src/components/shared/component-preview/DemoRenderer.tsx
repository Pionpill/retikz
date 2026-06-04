import { Children, type FC, type ReactElement, type ReactNode, cloneElement, isValidElement } from 'react';
import { Layout, type LayoutProps, RendererModeProvider } from '@retikz/react';

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
   *   故用 `RendererModeProvider` 经 context 注入渲染目标——其内部 `<Layout>`（未显式写 renderer）随 context 切 svg/canvas
   */
  interactive?: boolean;
};

/** 用当前渲染目标渲染 demo，避免每个示例源码都显式写 renderer */
export const DemoRenderer: FC<DemoRendererProps> = props => {
  const { Component, rendererMode, interactive } = props;
  // 交互 demo 无法静态展开注入 renderer，改用 context Provider 注入（demo 内 <Layout> 未写 renderer 时随之切换）
  if (interactive) {
    return (
      <RendererModeProvider mode={rendererMode}>
        <Component />
      </RendererModeProvider>
    );
  }
  return <>{applyRendererMode(Component({}), rendererMode)}</>;
};

/**
 * 把一段 SVG 字符串注入渲染区（vanilla 视图用：`renderPlot` 等 SSR 产物）
 * @description 自身约束子 svg 不超出父框（与 react/canvas 路径同口径）；下载时 renderPane 的 querySelector('svg') 照样命中
 */
export const RawSvgFrame: FC<{ svg: string }> = ({ svg }) => (
  <div
    className="flex max-h-full max-w-full [&>svg]:max-h-full [&>svg]:max-w-full"
    dangerouslySetInnerHTML={{ __html: svg }}
  />
);
