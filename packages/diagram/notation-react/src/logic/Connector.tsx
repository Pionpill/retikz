import type { ConnectorInput } from '@retikz/notation';
import type { InputConnector } from '@retikz/notation-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { ConnectorInputEmbedAdapter } from '@retikz/notation-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { NotationEmbeddableComponent } from '../shared';

import { collectConnectorPath, hasAuthoringChildren } from './authoring';

type ConnectorBaseProps = Omit<ConnectorInput, 'children' | 'way'>;
type ConnectorWay = Exclude<ConnectorInput['way'], undefined>;

/** Connector 的 React 编写参数，两套作者语法必须且只能选择一套 */
export type ConnectorProps = ConnectorBaseProps &
  Readonly<{ children?: ReactNode; way?: never } | { children?: never; way: ConnectorWay }>;

/** 将 Connector 的 React children 或 way 组装为 Notation Vanilla Input */
const createConnectorInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { id: _id, children, way, ...pathInput } = props as ConnectorProps;
  void _id;
  const hasChildren = hasAuthoringChildren(children);
  if (hasChildren && way !== undefined) {
    throw new Error('Connector requires exactly one of `children` or `way`.');
  }
  if (!hasChildren) return { ...pathInput, way: way as ConnectorWay } satisfies InputConnector;
  const collected = collectConnectorPath(children, context.id);
  return withInputEmbedAdapters(
    { ...pathInput, authoringPath: collected.child } satisfies InputConnector,
    collected.adapters,
  );
};

const ConnectorComponent: FC<ConnectorProps> = () => null;

/** 将 Notation Connector 接入 React 编写流程的组件 */
export const Connector = ConnectorComponent as NotationEmbeddableComponent<ConnectorProps>;

Connector.displayName = 'Connector';
Connector.isTier2Embeddable = true;
Connector.inputEmbedAdapter = ConnectorInputEmbedAdapter;
Connector.createInputEmbedProps = createConnectorInput;
