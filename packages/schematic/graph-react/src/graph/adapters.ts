import type { InputEmbedAdapter } from '@retikz/vanilla';

import { createGraphProviders } from '@retikz/graph';

import { GraphConnector } from './GraphConnector';
import { GraphFrame } from './GraphFrame';
import { GraphNode } from './GraphNode';

type GraphCompositeProvider = ReturnType<typeof createGraphProviders>[number];

/** 用指定 composite provider 配置并擦除一个 React adapter 的具体 props 类型 */
const configureAdapter = <TProps>(
  adapter: InputEmbedAdapter<TProps>,
  provider: GraphCompositeProvider,
): InputEmbedAdapter<unknown> => {
  return {
    kind: adapter.kind,
    lower: (props, context) => {
      const contribution = adapter.lower(props as TProps, context);
      return {
        ...contribution,
        providerDependencies: {
          roots: [provider.key, ...contribution.providerDependencies.roots.slice(1)],
          providers: [provider, ...contribution.providerDependencies.providers.slice(1)],
        },
      };
    },
  };
};

/** 创建可一次性传给 React Input scene 的完整 Graph adapter 集合 */
export const createGraphReactAdapters = (): Array<InputEmbedAdapter<unknown>> => {
  const [graphFrame, graphNode, graphConnector] = createGraphProviders();
  return [
    configureAdapter(GraphFrame.inputEmbedAdapter, graphFrame),
    configureAdapter(GraphNode.inputEmbedAdapter, graphNode),
    configureAdapter(GraphConnector.inputEmbedAdapter, graphConnector),
  ];
};
