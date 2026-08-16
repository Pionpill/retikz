import type { CoreDependencyProvider } from '@retikz/core';

import { GraphConnectorDefinition } from './definition';

/** GraphConnector 的 Core Composite dependency provider */
export const GraphConnectorProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: GraphConnectorDefinition.namespace,
    type: GraphConnectorDefinition.type,
  }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => GraphConnectorDefinition,
});
