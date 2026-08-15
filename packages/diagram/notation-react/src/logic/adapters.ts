import type { InputEmbedAdapter } from '@retikz/vanilla';

import { createNotationProviders } from '@retikz/notation';

import { Connector } from './Connector';
import { Decision } from './Decision';
import { Junction } from './Junction';
import { LogicFrame } from './LogicFrame';
import { Stage } from './Stage';
import { Terminal } from './Terminal';

type NotationCompositeProvider = ReturnType<typeof createNotationProviders>[number];

/** 用指定 composite provider 配置并擦除一个 React adapter 的具体 props 类型 */
const configureAdapter = <TProps>(
  adapter: InputEmbedAdapter<TProps>,
  provider: NotationCompositeProvider,
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

/** 创建可一次性传给 React Input scene 的完整 Notation adapter 集合 */
export const createNotationReactAdapters = (): Array<InputEmbedAdapter<unknown>> => {
  const [logicFrame, terminal, stage, decision, junction, connector] = createNotationProviders();
  return [
    configureAdapter(LogicFrame.inputEmbedAdapter, logicFrame),
    configureAdapter(Terminal.inputEmbedAdapter, terminal),
    configureAdapter(Stage.inputEmbedAdapter, stage),
    configureAdapter(Decision.inputEmbedAdapter, decision),
    configureAdapter(Junction.inputEmbedAdapter, junction),
    configureAdapter(Connector.inputEmbedAdapter, connector),
  ];
};
