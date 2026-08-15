import type { InputGraphNode } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { GraphNodeInputEmbedAdapter } from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { GraphEmbeddableComponent } from '../shared';

import { collectSemanticNodeInput } from './authoring';

/** GraphNode 的 React 编写参数 */
export type GraphNodeProps = Omit<InputGraphNode, 'authoringNode'> &
  Readonly<{
    /** React embed 的稳定身份，省略时由宿主 embed 路径派生 */
    id?: string;
    children?: ReactNode;
  }>;

/** 将 React 文字 children 组装为 Graph Vanilla Input */
const createGraphNodeInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as GraphNodeProps;
  const collected = collectSemanticNodeInput(children, input, context.id);
  return withInputEmbedAdapters(collected.input satisfies InputGraphNode, collected.adapters);
};

const GraphNodeComponent: FC<GraphNodeProps> = () => null;

/** 将 GraphNode 接入 React 编写流程 */
export const GraphNode = GraphNodeComponent as GraphEmbeddableComponent<GraphNodeProps>;

GraphNode.displayName = 'GraphNode';
GraphNode.isTier2Embeddable = true;
GraphNode.inputEmbedAdapter = GraphNodeInputEmbedAdapter;
GraphNode.createInputEmbedProps = createGraphNodeInput;
