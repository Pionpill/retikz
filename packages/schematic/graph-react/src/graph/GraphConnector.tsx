import type { GraphConnectorCreateOptions } from '@retikz/graph';
import type { InputGraphConnector } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { GraphConnectorInputEmbedAdapter } from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { GraphEmbeddableComponent } from '../shared';

import { collectGraphConnectorPath, hasAuthoringChildren } from './authoring';

type GraphConnectorBaseProps = Omit<GraphConnectorCreateOptions, 'children' | 'way'>;
type GraphConnectorWay = Exclude<GraphConnectorCreateOptions['way'], undefined>;

/** GraphConnector 的 React 编写参数，两套作者语法必须且只能选择一套 */
export type GraphConnectorProps = GraphConnectorBaseProps &
  Readonly<{ children?: ReactNode; way?: never } | { children?: never; way: GraphConnectorWay }>;

/** 将 GraphConnector 的 React children 或 way 组装为 Graph Vanilla Input */
const createGraphConnectorInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { id: _id, children, way, ...pathInput } = props as GraphConnectorProps;
  void _id;
  const hasChildren = hasAuthoringChildren(children);
  if (hasChildren && way !== undefined) {
    throw new Error('GraphConnector requires exactly one of `children` or `way`.');
  }
  if (!hasChildren) return { ...pathInput, way: way as GraphConnectorWay } satisfies InputGraphConnector;
  const collected = collectGraphConnectorPath(children, context.id);
  return withInputEmbedAdapters(
    { ...pathInput, authoringPath: collected.child } satisfies InputGraphConnector,
    collected.adapters,
  );
};

const GraphConnectorComponent: FC<GraphConnectorProps> = () => null;

/** 将 GraphConnector 接入 React 编写流程的组件 */
export const GraphConnector = GraphConnectorComponent as GraphEmbeddableComponent<GraphConnectorProps>;

GraphConnector.displayName = 'GraphConnector';
GraphConnector.isTier2Embeddable = true;
GraphConnector.inputEmbedAdapter = GraphConnectorInputEmbedAdapter;
GraphConnector.createInputEmbedProps = createGraphConnectorInput;
