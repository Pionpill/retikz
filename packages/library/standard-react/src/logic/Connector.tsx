import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { ConnectorInput } from '@retikz/standard';
import type { FC } from 'react';

import { ConnectorDefinition, createConnector } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardConnectorReactNamespace } from '../shared';

/** Connector 的 React 编写参数，label 保持为 plain Core step input */
export type ConnectorProps = ConnectorInput;

const makeConnectorComposites = () => [ConnectorDefinition];

const connectorEmbeddableAdapter: EmbeddableTier2Adapter<ConnectorProps> = {
  displayName: 'Connector',
  namespace: StandardConnectorReactNamespace,
  contribute: props => {
    if ('children' in props && props.children !== undefined) {
      throw new Error('React Connector does not accept children; provide label as a plain prop.');
    }
    return { node: createConnector(props), datasets: {}, makeComposites: makeConnectorComposites };
  },
};

const ConnectorComponent: FC<ConnectorProps> = () => null;

/** 将 Standard Connector 接入 React 编写流程的组件 */
export const Connector = ConnectorComponent as StandardEmbeddableComponent<ConnectorProps>;

Connector.displayName = 'Connector';
Connector.isTier2Embeddable = true;
Connector.embeddableAdapter = connectorEmbeddableAdapter;
