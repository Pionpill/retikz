import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputGraph } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { GraphInputEmbedAdapter } from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { GraphEmbeddableComponent } from '../shared';

import { collectAuthoringChildren } from './authoring';

/** Graph presentation root 的 React 编写参数 */
export type GraphProps = Omit<InputGraph, 'children' | keyof GraphDefinitionOptions> &
  GraphDefinitionOptions &
  Readonly<{
    /** React embed 的稳定身份，省略时由宿主 embed 路径派生 */
    id?: string;
    /** 按 authored 顺序进入 Graph presentation root 的 children */
    children?: ReactNode;
  }>;

/** 将 React children 组装为 Graph Vanilla Input */
const createGraphInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { id: _id, children, ...input } = props as GraphProps;
  void _id;
  const collected = collectAuthoringChildren(children, context.id);
  return withInputEmbedAdapters({ ...input, children: collected.children } satisfies InputGraph, collected.adapters);
};

const GraphComponent: FC<GraphProps> = () => null;

/** 将 Graph presentation root 接入 React 编写流程 */
export const Graph = GraphComponent as GraphEmbeddableComponent<GraphProps>;

Graph.displayName = 'Graph';
Graph.isTier2Embeddable = true;
Graph.inputEmbedAdapter = GraphInputEmbedAdapter;
Graph.createInputEmbedProps = createGraphInput;
