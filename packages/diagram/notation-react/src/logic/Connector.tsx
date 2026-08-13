import type { ConnectorInput } from '@retikz/notation';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { ConnectorProvider, createConnector } from '@retikz/notation';

import type { NotationEmbeddableComponent } from '../shared';

import { hasAuthoringChildren, resolveConnectorSteps } from './authoring';

type ConnectorBaseProps = Omit<ConnectorInput, 'children' | 'way'>;
type ConnectorWay = Exclude<ConnectorInput['way'], undefined>;

/** Connector 的 React 编写参数，两套作者语法必须且只能选择一套 */
export type ConnectorProps = ConnectorBaseProps &
  Readonly<{ children?: ReactNode; way?: never } | { children?: never; way: ConnectorWay }>;

const connectorEmbeddableAdapter: EmbeddableTier2Adapter<ConnectorProps> = {
  displayName: 'Connector',
  contribute: props => {
    const { children, way, ...pathInput } = props;
    const hasChildren = hasAuthoringChildren(children);
    if (hasChildren && way !== undefined) {
      throw new Error('Connector requires exactly one of `children` or `way`.');
    }
    const input: ConnectorInput = hasChildren
      ? { ...pathInput, children: resolveConnectorSteps(children) }
      : { ...pathInput, way: way as ConnectorWay };
    return {
      node: createConnector(input),
      compositeDependencies: { roots: [ConnectorProvider.key], providers: [ConnectorProvider] },
    };
  },
};

const ConnectorComponent: FC<ConnectorProps> = () => null;

/** 将 Notation Connector 接入 React 编写流程的组件 */
export const Connector = ConnectorComponent as NotationEmbeddableComponent<ConnectorProps>;

Connector.displayName = 'Connector';
Connector.isTier2Embeddable = true;
Connector.embeddableAdapter = connectorEmbeddableAdapter;
