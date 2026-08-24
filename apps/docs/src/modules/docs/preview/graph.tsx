import type { GraphLayoutHostProps } from '@retikz/graph-react';
import type { ReactElement, ReactNode } from 'react';

import { Layout } from '@retikz/react';
import { createElement, isValidElement } from 'react';

import type { PreviewSourceConfig } from '../components/component-preview/types';

import { PreviewGraph } from '../components/component-preview/theme';

type GraphPreviewRootProps = GraphLayoutHostProps & {
  children?: ReactNode;
};

/** 将 standalone Graph 的 Layout 宿主属性提升到 canonical preview 的外层 Layout */
const graphCanonicalRender = (node: ReactNode): ReactNode => {
  if (!isValidElement(node)) return node;
  if (node.type === Layout) return node;

  const element = node as ReactElement<GraphPreviewRootProps>;
  const { children, width, height, viewBox, className, style, renderer, themeStyles, ...graphProps } = element.props;
  const hostProps: GraphLayoutHostProps = {
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
    ...(viewBox === undefined ? {} : { viewBox }),
    ...(className === undefined ? {} : { className }),
    ...(style === undefined ? {} : { style }),
    ...(renderer === undefined ? {} : { renderer }),
    ...(themeStyles === undefined ? {} : { themeStyles }),
  };

  return <Layout {...hostProps}>{createElement(PreviewGraph, graphProps, children)}</Layout>;
};

/** 为静态 Graph demo 创建遵守 standalone/embedded 边界的 preview source */
export const createGraphPreviewSource = (render: () => ReactNode): PreviewSourceConfig => ({
  deriveIR: false,
  canonicalRender: () => graphCanonicalRender(render()),
});

/** 为受控 Graph demo 的 canonicalRender 补齐外层 Layout */
export const withGraphPreviewSource = (source: PreviewSourceConfig): PreviewSourceConfig => ({
  ...source,
  canonicalRender:
    source.canonicalRender === undefined ? undefined : () => graphCanonicalRender(source.canonicalRender?.()),
});
