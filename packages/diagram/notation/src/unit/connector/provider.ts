import type { CompositeDependencyProvider } from '@retikz/core';

import { ConnectorDefinition } from './definition';

const makeConnectorDefinition = () => ConnectorDefinition;

/** Connector 的 Core Composite dependency provider */
export const ConnectorProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: ConnectorDefinition.namespace, type: ConnectorDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeConnectorDefinition,
});
