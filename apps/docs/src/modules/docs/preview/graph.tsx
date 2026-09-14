import type { GraphLayoutHostProps } from '@retikz/graph-react';
import type { ReactElement, ReactNode } from 'react';

import { Layout } from '@retikz/react';
import { createElement, isValidElement } from 'react';

import type { PreviewSourceConfig } from '../components/component-preview/types';

import { PreviewGraph } from '../components/component-preview/theme';
import { LogicFigure, logicFigureGraphProps, logicFigureRelationKinds } from '../components/logic-figure';

type GraphPreviewRootProps = GraphLayoutHostProps & {
  children?: ReactNode;
  /** 仅供 LogicFigure wrapper 决定是否注入语义颜色，不能写入 Graph Source */
  semanticColors?: boolean;
};

/** 将 standalone Graph 的 Layout 宿主属性提升到 canonical preview 的外层 Layout */
const graphCanonicalRender = (node: ReactNode): ReactNode => {
  if (!isValidElement(node)) return node;
  if (node.type === Layout) return node;

  const element = node as ReactElement<GraphPreviewRootProps>;
  const resolvedProps =
    node.type === LogicFigure
      ? {
          ...element.props,
          ...logicFigureGraphProps(element.props.semanticColors),
          relationKinds: logicFigureRelationKinds,
        }
      : element.props;
  const { children, width, height, viewBox, className, renderer, themeStyles, ...graphProps } = resolvedProps;
  // LogicFigure 的 Docs-only 选项不能进入严格的 Graph Source schema
  delete graphProps.semanticColors;
  const hostProps: GraphLayoutHostProps = {
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
    ...(viewBox === undefined ? {} : { viewBox }),
    ...(className === undefined ? {} : { className }),
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
    source.canonicalRender === undefined ? undefined : lang => graphCanonicalRender(source.canonicalRender?.(lang)),
});
